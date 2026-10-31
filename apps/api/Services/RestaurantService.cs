using api.Common;
using api.Models;
using api.Services.Places;
using Supabase.Postgrest;
using Supabase.Postgrest.Exceptions;
using Supabase.Postgrest.Interfaces;
using Supabase.Postgrest.Responses;

namespace api.Services;

/// <summary>
/// Reads restaurants from the database and creates them from places selected in the search.
/// </summary>
/// <param name="supabase">Client of the database.</param>
/// <param name="placeProvider">Looks up the details of a place selected in the search.</param>
/// <param name="configuration">Application settings, holding the default city suggestions are sorted from
/// (Places:DefaultLocation).</param>
public class RestaurantService(Supabase.Client supabase, IPlaceProvider placeProvider, IConfiguration configuration) : IRestaurantService
{
    /// <summary>
    /// Emoji given to restaurants created from a place, which has none.
    /// </summary>
    private const string DefaultEmoji = "🍽️";

    /// <inheritdoc />
    public async Task<IReadOnlyList<Restaurant>> GetAllAsync(CancellationToken cancellationToken)
    {
        ModeledResponse<Restaurant> response = await supabase.From<Restaurant>().Get(cancellationToken);
        return response.Models;
    }

    /// <inheritdoc />
    public async Task<Result<Restaurant>> GetByIdAsync(string id, CancellationToken cancellationToken)
    {
        // Ids are uuids: querying with another format makes PostgreSQL fail instead of returning no row.
        if (!Guid.TryParse(id, out _))
            return Result<Restaurant>.Failure(new Error(ErrorType.NotFound, "Restaurant not found."));

        ModeledResponse<Restaurant> response = await supabase.From<Restaurant>()
            .Where(r => r.Id == id)
            .Limit(1)
            .Get(cancellationToken);
        Restaurant? restaurant = response.Models.FirstOrDefault();
        return restaurant is null
            ? Result<Restaurant>.Failure(new Error(ErrorType.NotFound, "Restaurant not found."))
            : Result<Restaurant>.Success(restaurant);
    }

    /// <inheritdoc />
    public async Task<Result<RestaurantFromPlaceResponse>> GetOrCreateFromPlaceAsync(string placeId, CancellationToken cancellationToken)
    {
        //Check if already in base
        Restaurant? existing = await FindByOsmIdAsync(placeId, cancellationToken);
        if (existing is not null)
            return Result<RestaurantFromPlaceResponse>.Success(new RestaurantFromPlaceResponse(existing, Created: false));

        //Lookup on OSM
        Result<PlaceDetails> details = await placeProvider.GetDetailsAsync(placeId, cancellationToken);
        if (!details.IsSuccess)
            return Result<RestaurantFromPlaceResponse>.Failure(details.Error!);

        // Insert, not upsert: postgrest-csharp always sends the primary key on upserts ("id": "", rejected by the uuid
        // column), while an insert lets the database generate it. If another request created the same restaurant
        // in the meantime, the unique index on osm_id rejects this insert and we read the existing row instead: that
        // request was the first, not this one.
        Restaurant? saved;
        bool created;
        try
        {
            ModeledResponse<Restaurant> inserted = await supabase.From<Restaurant>().Insert(ToRestaurant(details.Value!), cancellationToken: cancellationToken);
            saved = inserted.Models.FirstOrDefault() ?? await FindByOsmIdAsync(placeId, cancellationToken);
            created = true;
        }
        catch (PostgrestException ex) when (PostgrestErrors.IsUniqueViolation(ex))
        {
            saved = await FindByOsmIdAsync(placeId, cancellationToken);
            created = false;
        }

        return saved is null
            ? Result<RestaurantFromPlaceResponse>.Failure(new Error(ErrorType.Unavailable, "Could not save the restaurant."))
            : Result<RestaurantFromPlaceResponse>.Success(new RestaurantFromPlaceResponse(saved, created));
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<RestaurantSuggestionResponse>> GetSuggestionsAsync(string userId, double? lat, double? lon, int limit, CancellationToken cancellationToken)
    {
        ModeledResponse<Rating> rated = await supabase.From<Rating>()
            .Select("id_restaurant")
            .Where(r => r.UserId == userId)
            .Get(cancellationToken);
        List<string> ratedIds = rated.Models.Select(r => r.RestaurantId).Distinct().ToList();

        // PostgREST cannot sort by a computed distance: the unrated restaurants are read and ranked here, so only the
        // suggestions are sent to the client.
        ModeledResponse<Restaurant> unrated = await UnratedRestaurantsQuery(supabase.From<Restaurant>(), ratedIds).Get(cancellationToken);
        GeoPoint? userPosition = SearchPosition.FromQuery(lat, lon);
        IReadOnlyList<RestaurantSuggestionResponse> suggestions = RestaurantSuggestionResponse.Rank(unrated.Models, userPosition ?? SearchPosition.Default(configuration), userPosition is not null, limit);
        if (suggestions.Count == 0)
            return suggestions;

        // The ratings of the suggested restaurants only: their global score, and the users followed who ate there
        List<string> suggestedIds = suggestions.Select(s => s.Restaurant.Id).ToList();
        ModeledResponse<Rating> ratings = await RestaurantsRatingsQuery(supabase.From<Rating>(), suggestedIds).Get(cancellationToken);
        ModeledResponse<Follow> follows = await supabase.From<Follow>()
            .Select("id_followed")
            .Where(f => f.FollowerId == userId)
            .Get(cancellationToken);
        HashSet<string> followedIds = follows.Models.Select(f => f.FollowedId).ToHashSet();

        // "rating.id_user" has no foreign key to "profiles": the profiles of the followed raters are read apart
        List<object> followedRaterIds = ratings.Models.Select(r => r.UserId).Where(followedIds.Contains).Distinct().Cast<object>().ToList();
        Dictionary<string, Profile> profilesById = [];
        if (followedRaterIds.Count > 0)
        {
            ModeledResponse<Profile> profiles = await supabase.From<Profile>()
                .Filter("id", Constants.Operator.In, followedRaterIds)
                .Get(cancellationToken);
            profilesById = profiles.Models.ToDictionary(p => p.Id);
        }

        return RestaurantSuggestionResponse.WithRatings(suggestions, ratings.Models, followedIds, profilesById);
    }

    /// <summary>
    /// Query of every rating, active or not, of the restaurants <paramref name="restaurantIds"/>.
    /// </summary>
    /// <param name="ratings">Query on the "rating" table to filter.</param>
    /// <param name="restaurantIds">Database ids of the restaurants (not empty: PostgREST refuses an empty list).</param>
    /// <returns>The filtered query, ready to send.</returns>
    public static IPostgrestTable<Rating> RestaurantsRatingsQuery(IPostgrestTable<Rating> ratings, IReadOnlyList<string> restaurantIds)
        => ratings.Filter("id_restaurant", Constants.Operator.In, restaurantIds.Cast<object>().ToList());

    /// <summary>
    /// Query of the restaurants whose id is not in <paramref name="ratedIds"/>.
    /// </summary>
    /// <param name="restaurants">Query on the "restaurants" table to filter.</param>
    /// <param name="ratedIds">Database ids of the restaurants the user rated; every restaurant is kept when empty
    /// (PostgREST rejects an empty "not in" list).</param>
    /// <returns>The filtered query, ready to send.</returns>
    public static IPostgrestTable<Restaurant> UnratedRestaurantsQuery(IPostgrestTable<Restaurant> restaurants, IReadOnlyList<string> ratedIds)
        => ratedIds.Count == 0
            ? restaurants
            : restaurants.Not("id", Constants.Operator.In, ratedIds.ToList());

    /// <summary>
    /// Looks up a restaurant by its OpenStreetMap identifier.
    /// </summary>
    private async Task<Restaurant?> FindByOsmIdAsync(string osmId, CancellationToken cancellationToken)
    {
        ModeledResponse<Restaurant> response = await supabase.From<Restaurant>()
            .Where(r => r.OsmId == osmId)
            .Limit(1)
            .Get(cancellationToken);
        return response.Models.FirstOrDefault();
    }

    /// <summary>
    /// Maps place details to a new restaurant row.
    /// </summary>
    private static Restaurant ToRestaurant(PlaceDetails details) => new()
    {
        OsmId = details.PlaceId,
        Name = details.Name,
        Address = details.Address,
        Lat = details.Lat,
        Lng = details.Lng,
        Emoji = DefaultEmoji
    };
}
