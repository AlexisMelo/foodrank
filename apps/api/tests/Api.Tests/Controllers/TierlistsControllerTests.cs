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
    private const string UserId = "user-1";

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
    /// The controller refuses a null service instead of failing on the first request.
    /// </summary>
    [Fact]
    public void Constructor_NullService_Throws()
    {
        Assert.Throws<ArgumentNullException>(() => new TierlistsController(null!));
    }
}
