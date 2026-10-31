using api.Models;
using api.Services.Places;

namespace Api.Tests.Models;

/// <summary>
/// Tests the choice and order of the restaurants suggested on the Explore page.
/// </summary>
public class RestaurantSuggestionResponseTests
{
    /// <summary>
    /// Position of the user in the tests: Caen.
    /// </summary>
    private static readonly GeoPoint Caen = new(49.18, -0.37);

    /// <summary>
    /// Builds the restaurant <paramref name="id"/> at (<paramref name="lat"/>, <paramref name="lng"/>).
    /// </summary>
    private static Restaurant At(string id, double lat, double lng) => new() { Id = id, Name = id, Lat = lat, Lng = lng };

    /// <summary>
    /// Id of a user the logged-in user follows.
    /// </summary>
    private const string CamilleId = "camille";

    /// <summary>
    /// Id of another user the logged-in user follows.
    /// </summary>
    private const string HugoId = "hugo";

    /// <summary>
    /// Id of a user the logged-in user does not follow.
    /// </summary>
    private const string StrangerId = "stranger";

    /// <summary>
    /// Users the logged-in user follows in the tests.
    /// </summary>
    private static readonly HashSet<string> Followed = [CamilleId, HugoId];

    /// <summary>
    /// Profiles of the users followed, by user id.
    /// </summary>
    private static readonly Dictionary<string, Profile> FollowedProfiles = new()
    {
        [CamilleId] = new Profile { Id = CamilleId, Username = "camille", DisplayName = "Camille", AvatarUrl = "https://img.test/camille.png" },
        [HugoId] = new Profile { Id = HugoId, Username = "hugo" }
    };

    /// <summary>
    /// Builds a rating of <paramref name="restaurantId"/> by <paramref name="userId"/>, given <paramref name="daysAgo"/>
    /// days ago, with the same <paramref name="score"/> for the three criteria.
    /// </summary>
    private static Rating RatingOf(string restaurantId, string userId, int score, int daysAgo, bool isActive = true) => new()
    {
        RestaurantId = restaurantId,
        UserId = userId,
        Date = DateTimeOffset.UtcNow.AddDays(-daysAgo),
        FoodRating = score,
        ServiceRating = score,
        SettingRating = score,
        IsActive = isActive
    };

    /// <summary>
    /// Suggestions of <paramref name="ids"/>, in this order, as <see cref="RestaurantSuggestionResponse.Rank"/> gives them.
    /// </summary>
    private static IReadOnlyList<RestaurantSuggestionResponse> Suggestions(params string[] ids)
        => RestaurantSuggestionResponse.Rank(ids.Select(id => At(id, 49.18, -0.37)), Caen, isUserPosition: true, limit: 5);

    /// <summary>
    /// The nearest restaurant comes first, whatever the order they are read in.
    /// </summary>
    [Fact]
    public void Rank_SortsNearestFirst()
    {
        Restaurant[] restaurants = [At("paris", 48.85, 2.35), At("mid", 49.2, -0.37), At("near", 49.185, -0.37)];

        IReadOnlyList<RestaurantSuggestionResponse> suggestions = RestaurantSuggestionResponse.Rank(restaurants, Caen, isUserPosition: true, limit: 5);

        Assert.Equal(["near", "mid", "paris"], suggestions.Select(s => s.Restaurant.Id));
    }

    /// <summary>
    /// Only the <c>limit</c> nearest restaurants are suggested.
    /// </summary>
    [Fact]
    public void Rank_KeepsAtMostLimit()
    {
        Restaurant[] restaurants = [At("paris", 48.85, 2.35), At("mid", 49.2, -0.37), At("near", 49.185, -0.37)];

        IReadOnlyList<RestaurantSuggestionResponse> suggestions = RestaurantSuggestionResponse.Rank(restaurants, Caen, isUserPosition: true, limit: 2);

        Assert.Equal(["near", "mid"], suggestions.Select(s => s.Restaurant.Id));
    }

    /// <summary>
    /// From the user's position, each suggestion carries its distance in kilometers.
    /// </summary>
    [Fact]
    public void Rank_FromUserPosition_ReturnsDistances()
    {
        IReadOnlyList<RestaurantSuggestionResponse> suggestions = RestaurantSuggestionResponse.Rank([At("near", 49.185, -0.37)], Caen, isUserPosition: true, limit: 5);

        Assert.Equal(0.556, suggestions[0].DistanceKm!.Value, precision: 3);
    }

    /// <summary>
    /// From the default city, the restaurants are still sorted from it, but no distance is returned: it would not be
    /// the user's.
    /// </summary>
    [Fact]
    public void Rank_FromDefaultCity_SortsFromItWithoutDistance()
    {
        GeoPoint paris = new(48.8566, 2.3522);
        Restaurant[] restaurants = [At("caen", 49.18, -0.37), At("paris", 48.85, 2.35)];

        IReadOnlyList<RestaurantSuggestionResponse> suggestions = RestaurantSuggestionResponse.Rank(restaurants, paris, isUserPosition: false, limit: 5);

        Assert.Equal(["paris", "caen"], suggestions.Select(s => s.Restaurant.Id));
        Assert.All(suggestions, s => Assert.Null(s.DistanceKm));
    }

    /// <summary>
    /// With a maximum distance, the farther restaurants are left out (the range of the recommendations: 10 km).
    /// </summary>
    [Fact]
    public void Rank_MaxDistance_LeavesOutTheFartherRestaurants()
    {
        // 8.9 km and 11.1 km north of Caen
        Restaurant[] restaurants = [At("out", 49.28, -0.37), At("in", 49.26, -0.37)];

        IReadOnlyList<RestaurantSuggestionResponse> suggestions = RestaurantSuggestionResponse.Rank(
            restaurants, Caen, isUserPosition: true, limit: 5, RestaurantSuggestionResponse.MaxRecommendationDistanceKm);

        Assert.Equal(["in"], suggestions.Select(s => s.Restaurant.Id));
    }

    /// <summary>
    /// Builds the active rating of <paramref name="restaurantId"/> by <paramref name="userId"/> with the given scores.
    /// </summary>
    private static Rating Scored(string restaurantId, string userId, int food, int service, int setting) => new()
    {
        RestaurantId = restaurantId,
        UserId = userId,
        Date = DateTimeOffset.UtcNow,
        FoodRating = food,
        ServiceRating = service,
        SettingRating = setting,
        IsActive = true
    };

    /// <summary>
    /// A restaurant is recommended by a user followed whose rating averages more than 7; an average of 7 or less, or a
    /// rating by a user not followed, does not recommend it.
    /// </summary>
    [Fact]
    public void RecommendedIds_KeepsTheRestaurantsAUserFollowedRatesMoreThanSeven()
    {
        Rating[] ratings =
        [
            Scored("just-above", CamilleId, 8, 7, 7),
            Scored("just-seven", HugoId, 8, 7, 6),
            Scored("great", HugoId, 9, 9, 9),
            Scored("stranger-pick", StrangerId, 10, 10, 10)
        ];

        IReadOnlyList<string> ids = RestaurantSuggestionResponse.RecommendedIds(ratings, Followed, []);

        Assert.Equal(["just-above", "great"], ids);
    }

    /// <summary>
    /// Only the active rating of a user followed, their current opinion, counts: not their previous ratings.
    /// </summary>
    [Fact]
    public void RecommendedIds_OnlyTheActiveRatingCounts()
    {
        Rating[] ratings =
        [
            RatingOf("changed-mind", CamilleId, 9, daysAgo: 10, isActive: false),
            RatingOf("changed-mind", CamilleId, 3, daysAgo: 1),
            RatingOf("came-round", HugoId, 2, daysAgo: 10, isActive: false),
            RatingOf("came-round", HugoId, 8, daysAgo: 1)
        ];

        IReadOnlyList<string> ids = RestaurantSuggestionResponse.RecommendedIds(ratings, Followed, []);

        Assert.Equal(["came-round"], ids);
    }

    /// <summary>
    /// A restaurant the logged-in user rated, even long ago, is not recommended to them; one recommended by several users
    /// followed is listed once.
    /// </summary>
    [Fact]
    public void RecommendedIds_LeavesOutTheRestaurantsIRated_AndListsEachOnce()
    {
        Rating[] ratings =
        [
            RatingOf("tried", CamilleId, 9, daysAgo: 1),
            RatingOf("loved", CamilleId, 9, daysAgo: 1),
            RatingOf("loved", HugoId, 8, daysAgo: 2)
        ];

        IReadOnlyList<string> ids = RestaurantSuggestionResponse.RecommendedIds(ratings, Followed, ["tried"]);

        Assert.Equal(["loved"], ids);
    }

    /// <summary>
    /// Ranked suggestions have no global score nor followed raters yet: <see cref="RestaurantSuggestionResponse.WithRatings"/>
    /// adds them.
    /// </summary>
    [Fact]
    public void Rank_ReturnsNoRatingsYet()
    {
        RestaurantSuggestionResponse suggestion = Suggestions("near")[0];

        Assert.Null(suggestion.GlobalScore);
        Assert.Empty(suggestion.FollowedRaters);
    }

    /// <summary>
    /// The global score averages the active ratings of each restaurant, of every user; the previous ratings, kept as
    /// history, are left out.
    /// </summary>
    [Fact]
    public void WithRatings_AveragesTheActiveRatingsOfEachRestaurant()
    {
        Rating[] ratings =
        [
            RatingOf("near", StrangerId, 9, daysAgo: 1),
            RatingOf("near", CamilleId, 6, daysAgo: 2),
            RatingOf("near", CamilleId, 1, daysAgo: 3, isActive: false),
            RatingOf("mid", HugoId, 4, daysAgo: 1)
        ];

        IReadOnlyList<RestaurantSuggestionResponse> suggestions = RestaurantSuggestionResponse.WithRatings(Suggestions("near", "mid"), ratings, Followed, FollowedProfiles);

        Assert.Equal(["near", "mid"], suggestions.Select(s => s.Restaurant.Id));
        Assert.Equal(7.5f, suggestions[0].GlobalScore);
        Assert.Equal(4f, suggestions[1].GlobalScore);
    }

    /// <summary>
    /// A restaurant nobody rated has no global score and no followed rater.
    /// </summary>
    [Fact]
    public void WithRatings_NobodyRated_ReturnsNoScoreAndNoRater()
    {
        IReadOnlyList<RestaurantSuggestionResponse> suggestions = RestaurantSuggestionResponse.WithRatings(
            Suggestions("near"), [RatingOf("other", CamilleId, 8, daysAgo: 1)], Followed, FollowedProfiles);

        Assert.Null(suggestions[0].GlobalScore);
        Assert.Empty(suggestions[0].FollowedRaters);
    }

    /// <summary>
    /// The followed raters are the users followed who rated the restaurant, even with a previous rating only, each listed
    /// once, the most recent rating first; the users not followed are left out.
    /// </summary>
    [Fact]
    public void WithRatings_ListsTheFollowedUsersWhoRated_MostRecentFirst()
    {
        Rating[] ratings =
        [
            RatingOf("near", CamilleId, 8, daysAgo: 1),
            RatingOf("near", StrangerId, 8, daysAgo: 2),
            RatingOf("near", HugoId, 5, daysAgo: 3, isActive: false),
            RatingOf("near", CamilleId, 6, daysAgo: 4, isActive: false)
        ];

        IReadOnlyList<RestaurantSuggestionResponse> suggestions = RestaurantSuggestionResponse.WithRatings(Suggestions("near"), ratings, Followed, FollowedProfiles);

        Assert.Equal(
            [
                new UserSummaryResponse(CamilleId, "camille", "Camille", "https://img.test/camille.png"),
                new UserSummaryResponse(HugoId, "hugo", null, null)
            ],
            suggestions[0].FollowedRaters);
    }

    /// <summary>
    /// A followed rater whose profile could not be read is left out, rather than failing the suggestions.
    /// </summary>
    [Fact]
    public void WithRatings_RaterWithoutProfile_IsLeftOut()
    {
        IReadOnlyList<RestaurantSuggestionResponse> suggestions = RestaurantSuggestionResponse.WithRatings(
            Suggestions("near"), [RatingOf("near", CamilleId, 8, daysAgo: 1)], Followed, new Dictionary<string, Profile>());

        Assert.Empty(suggestions[0].FollowedRaters);
        Assert.Equal(8f, suggestions[0].GlobalScore);
    }
}
