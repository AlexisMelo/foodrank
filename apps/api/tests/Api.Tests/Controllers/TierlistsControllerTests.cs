using System.Net;
using System.Net.Http.Json;
using api.Common;
using api.Controllers;
using api.Models;

namespace Api.Tests.Controllers;

/// <summary>
/// Tests the /api/tierlists endpoints through HTTP, with in-memory auth and tierlist services.
/// </summary>
public class TierlistsControllerTests : IDisposable
{
    /// <summary>
    /// Valid access token of <see cref="UserId"/>.
    /// </summary>
    private const string Token = "valid-token";

    /// <summary>
    /// Id of the logged-in user.
    /// </summary>
    private const string UserId = "11111111-1111-1111-1111-111111111111";

    /// <summary>
    /// In-memory API, recreated for each test so tierlists do not leak between tests.
    /// </summary>
    private readonly ApiFactory _factory = new();

    /// <summary>
    /// Client sending requests to <see cref="_factory"/>.
    /// </summary>
    private readonly HttpClient _client;

    /// <summary>
    /// Creates the client and a valid token.
    /// </summary>
    public TierlistsControllerTests()
    {
        _client = _factory.CreateClient();
        _factory.AuthService.UserIdsByToken[Token] = UserId;
    }

    /// <summary>
    /// Disposes the in-memory API.
    /// </summary>
    public void Dispose() => _factory.Dispose();

    /// <summary>
    /// Sends a tierlist creation, with the auth cookie when <paramref name="token"/> is given.
    /// </summary>
    private Task<HttpResponseMessage> CreateAsync(object body, string? token = Token)
    {
        HttpRequestMessage request = new(HttpMethod.Post, "/api/tierlists")
        {
            Content = JsonContent.Create(body)
        };
        if (token is not null)
            request.Headers.Add("Cookie", $"{SupabaseAuthenticationHandler.CookieName}={token}");
        return _client.SendAsync(request);
    }

    /// <summary>
    /// A valid tierlist from a logged-in user is saved for that user, and returned with its generated id, in camelCase
    /// for the frontend.
    /// </summary>
    [Fact]
    public async Task Create_LoggedIn_SavesTierlistForUser()
    {
        HttpResponseMessage response = await CreateAsync(new { emoji = "🍕", name = "Best pizzas", description = "Crispy only", pinned = true });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Tierlist tierlist = Assert.Single(_factory.TierlistService.Tierlists);
        Assert.Equal(UserId, tierlist.UserId);
        Assert.Equal("🍕", tierlist.Emoji);
        Assert.Equal("Best pizzas", tierlist.Name);
        Assert.Equal("Crispy only", tierlist.Description);
        Assert.True(tierlist.Pinned);

        string json = await response.Content.ReadAsStringAsync();
        Assert.Contains($"\"id\":{tierlist.Id}", json);
        Assert.Contains($"\"userId\":\"{UserId}\"", json);
        Assert.Contains("\"name\":\"Best pizzas\"", json);
        Assert.Contains("\"pinned\":true", json);
    }

    /// <summary>
    /// The description and the pinned flag are optional: without them, the tierlist has no description and is not pinned.
    /// </summary>
    [Fact]
    public async Task Create_OnlyEmojiAndName_SavesWithoutDescriptionNorPin()
    {
        HttpResponseMessage response = await CreateAsync(new { emoji = "🏆", name = "Top 10" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Tierlist tierlist = Assert.Single(_factory.TierlistService.Tierlists);
        Assert.Null(tierlist.Description);
        Assert.False(tierlist.Pinned);
    }

    /// <summary>
    /// The name is saved without the spaces around it, and a blank description is saved as no description.
    /// </summary>
    [Fact]
    public async Task Create_PaddedNameAndBlankDescription_SavesTrimmedNameAndNoDescription()
    {
        await CreateAsync(new { emoji = "🏆", name = "  Top 10  ", description = "   ", pinned = false });

        Tierlist tierlist = Assert.Single(_factory.TierlistService.Tierlists);
        Assert.Equal("Top 10", tierlist.Name);
        Assert.Null(tierlist.Description);
    }

    /// <summary>
    /// Without the auth cookie, the creation is refused with a 401.
    /// </summary>
    [Fact]
    public async Task Create_NoCookie_Returns401()
    {
        HttpResponseMessage response = await CreateAsync(new { emoji = "🏆", name = "Top 10" }, token: null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Empty(_factory.TierlistService.Tierlists);
    }

    /// <summary>
    /// A missing, empty or blank name is refused with a 400.
    /// </summary>
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Create_NoName_Returns400(string? name)
    {
        HttpResponseMessage response = await CreateAsync(new { emoji = "🏆", name });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Empty(_factory.TierlistService.Tierlists);
    }

    /// <summary>
    /// A name longer than <see cref="CreateTierlistRequest.NameMaxLength"/> is refused with a 400; the maximum is accepted.
    /// </summary>
    [Theory]
    [InlineData(CreateTierlistRequest.NameMaxLength, HttpStatusCode.OK)]
    [InlineData(CreateTierlistRequest.NameMaxLength + 1, HttpStatusCode.BadRequest)]
    public async Task Create_NameLength_IsLimited(int length, HttpStatusCode expected)
    {
        HttpResponseMessage response = await CreateAsync(new { emoji = "🏆", name = new string('a', length) });

        Assert.Equal(expected, response.StatusCode);
    }

    /// <summary>
    /// A description longer than <see cref="CreateTierlistRequest.DescriptionMaxLength"/> is refused with a 400; the
    /// maximum is accepted.
    /// </summary>
    [Theory]
    [InlineData(CreateTierlistRequest.DescriptionMaxLength, HttpStatusCode.OK)]
    [InlineData(CreateTierlistRequest.DescriptionMaxLength + 1, HttpStatusCode.BadRequest)]
    public async Task Create_DescriptionLength_IsLimited(int length, HttpStatusCode expected)
    {
        HttpResponseMessage response = await CreateAsync(new { emoji = "🏆", name = "Top 10", description = new string('a', length) });

        Assert.Equal(expected, response.StatusCode);
    }

    /// <summary>
    /// The emoji is mandatory and must be a single character: none, an empty one or several are refused with a 400.
    /// </summary>
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("🍕🍔")]
    [InlineData("ab")]
    public async Task Create_InvalidEmoji_Returns400(string? emoji)
    {
        HttpResponseMessage response = await CreateAsync(new { emoji, name = "Top 10" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Empty(_factory.TierlistService.Tierlists);
    }

    /// <summary>
    /// Emojis made of several code points (variation selector, zero width joiner, flag) count as one character.
    /// </summary>
    [Theory]
    [InlineData("🌶️")]
    [InlineData("👨‍🍳")]
    [InlineData("🇫🇷")]
    public async Task Create_ComposedEmoji_IsAccepted(string emoji)
    {
        HttpResponseMessage response = await CreateAsync(new { emoji, name = "Top 10" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(emoji, Assert.Single(_factory.TierlistService.Tierlists).Emoji);
    }

    /// <summary>
    /// Each created tierlist gets its own id, returned to the client.
    /// </summary>
    [Fact]
    public async Task Create_Twice_ReturnsDistinctIds()
    {
        HttpResponseMessage first = await CreateAsync(new { emoji = "🏆", name = "Top 10" });
        HttpResponseMessage second = await CreateAsync(new { emoji = "🏆", name = "Top 10" });

        TierlistResponse firstTierlist = (await first.Content.ReadFromJsonAsync<TierlistResponse>())!;
        TierlistResponse secondTierlist = (await second.Content.ReadFromJsonAsync<TierlistResponse>())!;
        Assert.NotEqual(firstTierlist.Id, secondTierlist.Id);
        Assert.Equal(2, _factory.TierlistService.Tierlists.Count);
    }

    /// <summary>
    /// Sends a GET to <paramref name="url"/>, with the auth cookie when <paramref name="token"/> is given.
    /// </summary>
    private Task<HttpResponseMessage> GetAsync(string url, string? token = Token)
    {
        HttpRequestMessage request = new(HttpMethod.Get, url);
        if (token is not null)
            request.Headers.Add("Cookie", $"{SupabaseAuthenticationHandler.CookieName}={token}");
        return _client.SendAsync(request);
    }

    /// <summary>
    /// A tierlist of any user is returned by its id, with its restaurants (oldest added first) and the date of its last
    /// change.
    /// </summary>
    [Fact]
    public async Task GetById_Existing_ReturnsTierlistWithRestaurants()
    {
        _factory.TierlistService.Tierlists.Add(new Tierlist
        {
            Id = 7,
            UserId = "22222222-2222-2222-2222-222222222222",
            Name = "Camille's picks",
            Emoji = "🍜",
            CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            UpdatedAt = new DateTime(2026, 2, 1, 0, 0, 0, DateTimeKind.Utc)
        });
        _factory.TierlistService.Restaurants.Add(new TierlistRestaurant { TierlistId = 7, RestaurantId = "r2", AddedAt = new DateTime(2026, 2, 1, 0, 0, 0, DateTimeKind.Utc) });
        _factory.TierlistService.Restaurants.Add(new TierlistRestaurant { TierlistId = 7, RestaurantId = "r1", AddedAt = new DateTime(2026, 1, 15, 0, 0, 0, DateTimeKind.Utc) });
        _factory.TierlistService.Restaurants.Add(new TierlistRestaurant { TierlistId = 8, RestaurantId = "r3" });

        HttpResponseMessage response = await GetAsync("/api/tierlists/7");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        TierlistResponse tierlist = (await response.Content.ReadFromJsonAsync<TierlistResponse>())!;
        Assert.Equal("Camille's picks", tierlist.Name);
        Assert.Equal(["r1", "r2"], tierlist.Restaurants.Select(r => r.RestaurantId));
        Assert.Equal(new DateTime(2026, 2, 1, 0, 0, 0, DateTimeKind.Utc), tierlist.UpdatedAt.ToUniversalTime());
    }

    /// <summary>
    /// An unknown id, or an id that is not a number (like the old mock ids), returns a 404.
    /// </summary>
    [Theory]
    [InlineData("/api/tierlists/42")]
    [InlineData("/api/tierlists/tl-alex-1")]
    public async Task GetById_Unknown_Returns404(string url)
    {
        HttpResponseMessage response = await GetAsync(url);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    /// <summary>
    /// Without the auth cookie, reading a tierlist is refused with a 401.
    /// </summary>
    [Fact]
    public async Task GetById_NoCookie_Returns401()
    {
        await CreateAsync(new { emoji = "🏆", name = "Top 10" });

        HttpResponseMessage response = await GetAsync("/api/tierlists/1", token: null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    /// <summary>
    /// Id of another user.
    /// </summary>
    private const string OtherUserId = "22222222-2222-2222-2222-222222222222";

    /// <summary>
    /// Last change of the tierlists stored by <see cref="AddTierlist"/>, long before the tests run.
    /// </summary>
    private static readonly DateTime LastChange = new(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);

    /// <summary>
    /// Stores a tierlist of <paramref name="userId"/>, last changed at <see cref="LastChange"/>.
    /// </summary>
    private Tierlist AddTierlist(long id, string userId, bool? pinned)
    {
        Tierlist tierlist = new() { Id = id, UserId = userId, Name = $"Tierlist {id}", Emoji = "🏆", Pinned = pinned, UpdatedAt = LastChange };
        _factory.TierlistService.Tierlists.Add(tierlist);
        return tierlist;
    }

    /// <summary>
    /// Sends a pin change of tierlist <paramref name="id"/>, with the auth cookie when <paramref name="token"/> is given.
    /// </summary>
    private Task<HttpResponseMessage> SetPinnedAsync(long id, object body, string? token = Token)
    {
        HttpRequestMessage request = new(HttpMethod.Put, $"/api/tierlists/{id}/pinned")
        {
            Content = JsonContent.Create(body)
        };
        if (token is not null)
            request.Headers.Add("Cookie", $"{SupabaseAuthenticationHandler.CookieName}={token}");
        return _client.SendAsync(request);
    }

    /// <summary>
    /// The owner pins their tierlist (never pinned before, stored as null) and gets it back pinned, marked as changed.
    /// </summary>
    [Fact]
    public async Task SetPinned_OwnTierlist_PinsItAndUpdatesTierlist()
    {
        Tierlist tierlist = AddTierlist(3, UserId, pinned: null);
        DateTime before = DateTime.UtcNow;

        HttpResponseMessage response = await SetPinnedAsync(3, new { pinned = true });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(tierlist.Pinned);
        Assert.True(tierlist.UpdatedAt >= before);
        TierlistResponse body = (await response.Content.ReadFromJsonAsync<TierlistResponse>())!;
        Assert.True(body.Pinned);
        Assert.True(body.UpdatedAt.ToUniversalTime() >= before);
    }

    /// <summary>
    /// The owner unpins a pinned tierlist, which also marks it as changed.
    /// </summary>
    [Fact]
    public async Task SetPinned_False_UnpinsItAndUpdatesTierlist()
    {
        Tierlist tierlist = AddTierlist(3, UserId, pinned: true);
        DateTime before = DateTime.UtcNow;

        HttpResponseMessage response = await SetPinnedAsync(3, new { pinned = false });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.False(tierlist.Pinned);
        Assert.True(tierlist.UpdatedAt >= before);
    }

    /// <summary>
    /// Any number of tierlists can be pinned: pinning one leaves the others pinned.
    /// </summary>
    [Fact]
    public async Task SetPinned_SeveralTierlists_AllStayPinned()
    {
        AddTierlist(1, UserId, pinned: true);
        AddTierlist(2, UserId, pinned: false);
        AddTierlist(3, UserId, pinned: false);

        await SetPinnedAsync(2, new { pinned = true });
        await SetPinnedAsync(3, new { pinned = true });

        Assert.All(_factory.TierlistService.Tierlists, t => Assert.True(t.Pinned));
    }

    /// <summary>
    /// A user cannot pin, nor unpin, a tierlist of another user: refused with a 403, the tierlist is unchanged.
    /// </summary>
    [Theory]
    [InlineData(false, true)]
    [InlineData(true, false)]
    public async Task SetPinned_TierlistOfAnotherUser_Returns403(bool current, bool requested)
    {
        Tierlist tierlist = AddTierlist(3, OtherUserId, pinned: current);

        HttpResponseMessage response = await SetPinnedAsync(3, new { pinned = requested });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal(current, tierlist.Pinned);
        Assert.Equal(LastChange, tierlist.UpdatedAt);
    }

    /// <summary>
    /// An unknown tierlist returns a 404.
    /// </summary>
    [Fact]
    public async Task SetPinned_Unknown_Returns404()
    {
        HttpResponseMessage response = await SetPinnedAsync(42, new { pinned = true });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    /// <summary>
    /// Without the pinned flag, the request is refused with a 400 and the tierlist is unchanged.
    /// </summary>
    [Fact]
    public async Task SetPinned_NoFlag_Returns400()
    {
        Tierlist tierlist = AddTierlist(3, UserId, pinned: true);

        HttpResponseMessage response = await SetPinnedAsync(3, new { });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.True(tierlist.Pinned);
    }

    /// <summary>
    /// Without the auth cookie, the pin change is refused with a 401.
    /// </summary>
    [Fact]
    public async Task SetPinned_NoCookie_Returns401()
    {
        Tierlist tierlist = AddTierlist(3, UserId, pinned: false);

        HttpResponseMessage response = await SetPinnedAsync(3, new { pinned = true }, token: null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.False(tierlist.Pinned);
    }

    /// <summary>
    /// Id of the restaurant added to and removed from the tierlists.
    /// </summary>
    private const string RestaurantId = "33333333-3333-3333-3333-333333333333";

    /// <summary>
    /// Stores the restaurant <paramref name="restaurantId"/>, with an active rating of <paramref name="ratedBy"/> when given.
    /// </summary>
    private void AddRestaurant(string? ratedBy, string restaurantId = RestaurantId)
    {
        _factory.RestaurantService.Restaurants.Add(new Restaurant { Id = restaurantId, Name = "Pizza Roma" });
        if (ratedBy is not null)
            _factory.RatingService.Ratings.Add(new Rating
            {
                RestaurantId = restaurantId,
                UserId = ratedBy,
                Date = DateTimeOffset.UtcNow,
                FoodRating = 80,
                ServiceRating = 70,
                SettingRating = 60,
                IsActive = true
            });
    }

    /// <summary>
    /// Stores <paramref name="restaurantId"/> as a restaurant of the tierlist <paramref name="tierlistId"/>.
    /// </summary>
    private void AddEntry(long tierlistId, string restaurantId = RestaurantId)
        => _factory.TierlistService.Restaurants.Add(new TierlistRestaurant { TierlistId = tierlistId, RestaurantId = restaurantId, AddedAt = LastChange });

    /// <summary>
    /// Sends the addition of a restaurant to the tierlist <paramref name="id"/>, with the auth cookie when
    /// <paramref name="token"/> is given.
    /// </summary>
    private Task<HttpResponseMessage> AddRestaurantAsync(long id, object body, string? token = Token)
    {
        HttpRequestMessage request = new(HttpMethod.Post, $"/api/tierlists/{id}/restaurants")
        {
            Content = JsonContent.Create(body)
        };
        if (token is not null)
            request.Headers.Add("Cookie", $"{SupabaseAuthenticationHandler.CookieName}={token}");
        return _client.SendAsync(request);
    }

    /// <summary>
    /// The owner adds a restaurant they rated: it is stored with its addition date, returned in the tierlist, and the
    /// tierlist is marked as changed.
    /// </summary>
    [Fact]
    public async Task AddRestaurant_RatedByOwner_AddsItAndUpdatesTierlist()
    {
        Tierlist tierlist = AddTierlist(3, UserId, pinned: false);
        AddRestaurant(ratedBy: UserId);
        DateTime before = DateTime.UtcNow;

        HttpResponseMessage response = await AddRestaurantAsync(3, new { restaurantId = RestaurantId });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        TierlistRestaurant entry = Assert.Single(_factory.TierlistService.Restaurants);
        Assert.Equal(3, entry.TierlistId);
        Assert.Equal(RestaurantId, entry.RestaurantId);
        Assert.True(entry.AddedAt >= before);
        Assert.True(tierlist.UpdatedAt >= before);

        TierlistResponse body = (await response.Content.ReadFromJsonAsync<TierlistResponse>())!;
        Assert.Equal(RestaurantId, Assert.Single(body.Restaurants).RestaurantId);
        Assert.True(body.UpdatedAt.ToUniversalTime() >= before);
    }

    /// <summary>
    /// A restaurant can be in several tierlists: adding it to one leaves it in the others, and the tierlist lists it
    /// after its older restaurants.
    /// </summary>
    [Fact]
    public async Task AddRestaurant_InAnotherTierlist_AddsItToThisOneToo()
    {
        AddTierlist(3, UserId, pinned: false);
        AddTierlist(4, UserId, pinned: false);
        AddRestaurant(ratedBy: UserId);
        AddRestaurant(ratedBy: UserId, restaurantId: "44444444-4444-4444-4444-444444444444");
        AddEntry(3, "44444444-4444-4444-4444-444444444444");
        AddEntry(4);

        HttpResponseMessage response = await AddRestaurantAsync(3, new { restaurantId = RestaurantId });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        TierlistResponse body = (await response.Content.ReadFromJsonAsync<TierlistResponse>())!;
        Assert.Equal(["44444444-4444-4444-4444-444444444444", RestaurantId], body.Restaurants.Select(r => r.RestaurantId));
        Assert.Contains(_factory.TierlistService.Restaurants, r => r.TierlistId == 4 && r.RestaurantId == RestaurantId);
    }

    /// <summary>
    /// The owner cannot add a restaurant they never rated, even one another user rated: refused with a 400, as the
    /// tierlist ranks restaurants by the owner's ratings.
    /// </summary>
    [Theory]
    [InlineData(null)]
    [InlineData(OtherUserId)]
    public async Task AddRestaurant_NotRatedByOwner_Returns400(string? ratedBy)
    {
        Tierlist tierlist = AddTierlist(3, UserId, pinned: false);
        AddRestaurant(ratedBy);

        HttpResponseMessage response = await AddRestaurantAsync(3, new { restaurantId = RestaurantId });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("Rate the restaurant", await response.Content.ReadAsStringAsync());
        Assert.Empty(_factory.TierlistService.Restaurants);
        Assert.Equal(LastChange, tierlist.UpdatedAt);
    }

    /// <summary>
    /// A restaurant already in the tierlist is refused with a 409, and is not added twice.
    /// </summary>
    [Fact]
    public async Task AddRestaurant_AlreadyInTierlist_Returns409()
    {
        AddTierlist(3, UserId, pinned: false);
        AddRestaurant(ratedBy: UserId);
        await AddRestaurantAsync(3, new { restaurantId = RestaurantId });

        HttpResponseMessage response = await AddRestaurantAsync(3, new { restaurantId = RestaurantId });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Single(_factory.TierlistService.Restaurants);
    }

    /// <summary>
    /// A user cannot add a restaurant to a tierlist of another user, even one they rated: refused with a 403, the
    /// tierlist is unchanged.
    /// </summary>
    [Fact]
    public async Task AddRestaurant_TierlistOfAnotherUser_Returns403()
    {
        Tierlist tierlist = AddTierlist(3, OtherUserId, pinned: false);
        AddRestaurant(ratedBy: UserId);

        HttpResponseMessage response = await AddRestaurantAsync(3, new { restaurantId = RestaurantId });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Empty(_factory.TierlistService.Restaurants);
        Assert.Equal(LastChange, tierlist.UpdatedAt);
    }

    /// <summary>
    /// An unknown tierlist returns a 404.
    /// </summary>
    [Fact]
    public async Task AddRestaurant_UnknownTierlist_Returns404()
    {
        AddRestaurant(ratedBy: UserId);

        HttpResponseMessage response = await AddRestaurantAsync(42, new { restaurantId = RestaurantId });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Contains("Tierlist not found", await response.Content.ReadAsStringAsync());
    }

    /// <summary>
    /// An unknown restaurant returns a 404, and nothing is added.
    /// </summary>
    [Fact]
    public async Task AddRestaurant_UnknownRestaurant_Returns404()
    {
        AddTierlist(3, UserId, pinned: false);

        HttpResponseMessage response = await AddRestaurantAsync(3, new { restaurantId = RestaurantId });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Contains("Restaurant not found", await response.Content.ReadAsStringAsync());
        Assert.Empty(_factory.TierlistService.Restaurants);
    }

    /// <summary>
    /// A missing, empty or blank restaurant id is refused with a 400.
    /// </summary>
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task AddRestaurant_NoRestaurantId_Returns400(string? restaurantId)
    {
        AddTierlist(3, UserId, pinned: false);

        HttpResponseMessage response = await AddRestaurantAsync(3, new { restaurantId });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Empty(_factory.TierlistService.Restaurants);
    }

    /// <summary>
    /// Without the auth cookie, the addition is refused with a 401.
    /// </summary>
    [Fact]
    public async Task AddRestaurant_NoCookie_Returns401()
    {
        AddTierlist(3, UserId, pinned: false);
        AddRestaurant(ratedBy: UserId);

        HttpResponseMessage response = await AddRestaurantAsync(3, new { restaurantId = RestaurantId }, token: null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Empty(_factory.TierlistService.Restaurants);
    }

    /// <summary>
    /// Sends the removal of <paramref name="restaurantId"/> from the tierlist <paramref name="id"/>, with the auth cookie
    /// when <paramref name="token"/> is given.
    /// </summary>
    private Task<HttpResponseMessage> RemoveRestaurantAsync(long id, string restaurantId, string? token = Token)
    {
        HttpRequestMessage request = new(HttpMethod.Delete, $"/api/tierlists/{id}/restaurants/{restaurantId}");
        if (token is not null)
            request.Headers.Add("Cookie", $"{SupabaseAuthenticationHandler.CookieName}={token}");
        return _client.SendAsync(request);
    }

    /// <summary>
    /// The owner removes a restaurant from their tierlist: only that row is deleted (the tierlist's other restaurants and
    /// the same restaurant in another tierlist are kept), and the tierlist is marked as changed.
    /// </summary>
    [Fact]
    public async Task RemoveRestaurant_OwnTierlist_RemovesItAndUpdatesTierlist()
    {
        Tierlist tierlist = AddTierlist(3, UserId, pinned: false);
        AddTierlist(4, UserId, pinned: false);
        AddEntry(3);
        AddEntry(3, "44444444-4444-4444-4444-444444444444");
        AddEntry(4);
        DateTime before = DateTime.UtcNow;

        HttpResponseMessage response = await RemoveRestaurantAsync(3, RestaurantId);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.DoesNotContain(_factory.TierlistService.Restaurants, r => r.TierlistId == 3 && r.RestaurantId == RestaurantId);
        Assert.Contains(_factory.TierlistService.Restaurants, r => r.TierlistId == 3 && r.RestaurantId == "44444444-4444-4444-4444-444444444444");
        Assert.Contains(_factory.TierlistService.Restaurants, r => r.TierlistId == 4 && r.RestaurantId == RestaurantId);
        Assert.True(tierlist.UpdatedAt >= before);

        TierlistResponse body = (await response.Content.ReadFromJsonAsync<TierlistResponse>())!;
        Assert.Equal("44444444-4444-4444-4444-444444444444", Assert.Single(body.Restaurants).RestaurantId);
        Assert.True(body.UpdatedAt.ToUniversalTime() >= before);
    }

    /// <summary>
    /// A restaurant that is not in the tierlist (unknown, or only in another tierlist) returns a 404, and nothing is
    /// removed.
    /// </summary>
    [Theory]
    [InlineData(RestaurantId)]
    [InlineData("unknown-restaurant")]
    public async Task RemoveRestaurant_NotInTierlist_Returns404(string restaurantId)
    {
        Tierlist tierlist = AddTierlist(3, UserId, pinned: false);
        AddTierlist(4, UserId, pinned: false);
        AddEntry(4);

        HttpResponseMessage response = await RemoveRestaurantAsync(3, restaurantId);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Single(_factory.TierlistService.Restaurants);
        Assert.Equal(LastChange, tierlist.UpdatedAt);
    }

    /// <summary>
    /// A user cannot remove a restaurant from a tierlist of another user: refused with a 403, the tierlist is unchanged.
    /// </summary>
    [Fact]
    public async Task RemoveRestaurant_TierlistOfAnotherUser_Returns403()
    {
        Tierlist tierlist = AddTierlist(3, OtherUserId, pinned: false);
        AddEntry(3);

        HttpResponseMessage response = await RemoveRestaurantAsync(3, RestaurantId);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Single(_factory.TierlistService.Restaurants);
        Assert.Equal(LastChange, tierlist.UpdatedAt);
    }

    /// <summary>
    /// An unknown tierlist returns a 404.
    /// </summary>
    [Fact]
    public async Task RemoveRestaurant_UnknownTierlist_Returns404()
    {
        HttpResponseMessage response = await RemoveRestaurantAsync(42, RestaurantId);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Contains("Tierlist not found", await response.Content.ReadAsStringAsync());
    }

    /// <summary>
    /// Without the auth cookie, the removal is refused with a 401.
    /// </summary>
    [Fact]
    public async Task RemoveRestaurant_NoCookie_Returns401()
    {
        AddTierlist(3, UserId, pinned: false);
        AddEntry(3);

        HttpResponseMessage response = await RemoveRestaurantAsync(3, RestaurantId, token: null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Single(_factory.TierlistService.Restaurants);
    }

    /// <summary>
    /// The controller refuses a null service instead of failing on the first request.
    /// </summary>
    [Fact]
    public void Constructor_NullService_Throws()
    {
        Assert.Throws<ArgumentNullException>(() => new TierlistsController(null!));
    }
}
