using api.Models;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Supabase.Postgrest;

namespace Api.Tests.Models;

/// <summary>
/// Tests the rows written when a rating is created: the new rating becomes the active one and the previous one is
/// deactivated, so only the latest rating of a user for a restaurant counts as their score; and when a rating is
/// deleted: the previous one becomes active again.
/// </summary>
public class RatingTests
{
    /// <summary>
    /// March <paramref name="day"/> 2026 at <paramref name="hour"/>:00 UTC.
    /// </summary>
    private static DateTimeOffset March(int day, int hour = 12) => new(2026, 3, day, hour, 0, 0, TimeSpan.Zero);

    /// <summary>
    /// Builds a rating of restaurant "r1" by "user-1" given at <paramref name="date"/>.
    /// </summary>
    private static Rating NewRating(DateTimeOffset date, bool isActive = false, int food = 5) => new()
    {
        RestaurantId = "r1",
        UserId = "user-1",
        Date = date,
        FoodRating = food,
        IsActive = isActive
    };

    /// <summary>
    /// The first rating of a restaurant is written alone, active.
    /// </summary>
    [Fact]
    public void PlanNew_FirstRating_WritesItActive()
    {
        IReadOnlyList<Rating> rows = Rating.PlanNew([], NewRating(March(9)));

        Rating row = Assert.Single(rows);
        Assert.Equal(March(9), row.Date);
        Assert.True(row.IsActive);
    }

    /// <summary>
    /// The previous active rating is written back deactivated, with its moment (part of the primary key) and scores
    /// unchanged, before the new active one.
    /// </summary>
    [Fact]
    public void PlanNew_PreviousActiveRating_DeactivatesItAndActivatesNewOne()
    {
        IReadOnlyList<Rating> rows = Rating.PlanNew([NewRating(March(1), isActive: true, food: 2)], NewRating(March(9), food: 9));

        Assert.Equal(
            [(March(1), 2, false), (March(9), 9, true)],
            rows.Select(r => (r.Date, r.FoodRating, r.IsActive)));
    }

    /// <summary>
    /// Several active ratings (data written outside the app) are all deactivated, leaving only the new one active.
    /// </summary>
    [Fact]
    public void PlanNew_SeveralActiveRatings_DeactivatesThemAll()
    {
        IReadOnlyList<Rating> rows = Rating.PlanNew([NewRating(March(1), isActive: true), NewRating(March(5), isActive: true)], NewRating(March(9)));

        Assert.Equal([false, false, true], rows.Select(r => r.IsActive));
    }

    /// <summary>
    /// Deleting the active rating activates the most recent of the others, with its moment and scores unchanged; the
    /// older ones stay inactive.
    /// </summary>
    [Fact]
    public void PlanDeletion_ActiveRating_ActivatesTheMostRecentOfTheOthers()
    {
        Rating active = NewRating(March(9), isActive: true);

        RatingDeletion? deletion = Rating.PlanDeletion([NewRating(March(1)), active, NewRating(March(5), food: 7)], March(9));

        Assert.NotNull(deletion);
        Assert.Same(active, deletion.Deleted);
        Assert.Equal((March(5), 7, true), (deletion.Activated!.Date, deletion.Activated.FoodRating, deletion.Activated.IsActive));
        Assert.Equal([(March(5), true), (March(1), false)], deletion.Remaining.Select(r => (r.Date, r.IsActive)));
    }

    /// <summary>
    /// Deleting a previous rating leaves the active one as it is: nothing is activated.
    /// </summary>
    [Fact]
    public void PlanDeletion_PreviousRating_KeepsTheActiveOne()
    {
        RatingDeletion? deletion = Rating.PlanDeletion([NewRating(March(1)), NewRating(March(9), isActive: true)], March(1));

        Assert.NotNull(deletion);
        Assert.Null(deletion.Activated);
        Assert.Equal([(March(9), true)], deletion.Remaining.Select(r => (r.Date, r.IsActive)));
    }

    /// <summary>
    /// Deleting the only rating leaves none: nothing to activate.
    /// </summary>
    [Fact]
    public void PlanDeletion_OnlyRating_LeavesNone()
    {
        RatingDeletion? deletion = Rating.PlanDeletion([NewRating(March(9), isActive: true)], March(9));

        Assert.NotNull(deletion);
        Assert.Null(deletion.Activated);
        Assert.Empty(deletion.Remaining);
    }

    /// <summary>
    /// The date is an instant: the same moment written in another time zone finds the rating.
    /// </summary>
    [Fact]
    public void PlanDeletion_SameInstantInAnotherTimeZone_FindsTheRating()
    {
        DateTimeOffset inParis = new(2026, 3, 9, 13, 0, 0, TimeSpan.FromHours(1));

        RatingDeletion? deletion = Rating.PlanDeletion([NewRating(March(9), isActive: true)], inParis);

        Assert.Equal(March(9), deletion?.Deleted.Date);
    }

    /// <summary>
    /// No rating at that moment, even a second off: nothing is planned.
    /// </summary>
    [Fact]
    public void PlanDeletion_UnknownMoment_ReturnsNull()
    {
        Assert.Null(Rating.PlanDeletion([NewRating(March(9), isActive: true)], March(9).AddSeconds(1)));
        Assert.Null(Rating.PlanDeletion([], March(9)));
    }

    /// <summary>
    /// The rows are sent to Supabase at their exact moment (issue #10: the Postgrest client converts dates to UTC before
    /// sending them, which shifted dates without time zone). The previous rating keeps its microseconds, so the upsert
    /// matches its primary key instead of inserting a copy.
    /// </summary>
    [Fact]
    public async Task PlanNew_RowsSentToSupabase_KeepTheirMoment()
    {
        DateTimeOffset previous = new DateTimeOffset(2026, 3, 1, 18, 30, 12, TimeSpan.Zero).AddTicks(1_234_560);
        // 23:15 in Paris, already the next day in UTC
        DateTimeOffset now = new(2026, 3, 9, 23, 15, 0, TimeSpan.FromHours(1));

        IReadOnlyList<Rating> rows = Rating.PlanNew([NewRating(previous, isActive: true)], NewRating(now));

        Assert.Equal([previous, now], await SentMoments(rows));
    }

    /// <summary>
    /// A rating read from Supabase keeps its exact moment, whatever the server's time zone.
    /// </summary>
    [Fact]
    public void Rating_ReadFromSupabase_KeepsItsMoment()
    {
        const string response = """[{"id_restaurant":"r1","id_user":"user-1","date":"2026-03-01T18:30:12.123456+00:00","is_active":true}]""";

        List<Rating> ratings = JsonConvert.DeserializeObject<List<Rating>>(response, Supabase.Postgrest.Client.SerializerSettings(new ClientOptions()))!;

        Assert.Equal(new DateTimeOffset(2026, 3, 1, 18, 30, 12, TimeSpan.Zero).AddTicks(1_234_560), Assert.Single(ratings).Date);
    }

    /// <summary>
    /// Upserts <paramref name="rows"/> with a Postgrest client and captures the request body just before it is sent,
    /// without sending it.
    /// </summary>
    /// <returns>The "date" value of each row, as sent to Supabase.</returns>
    private static async Task<IReadOnlyList<DateTimeOffset>> SentMoments(IReadOnlyList<Rating> rows)
    {
        Supabase.Postgrest.Client client = new("http://localhost/rest/v1");
        string? body = null;
        OnRequestPreparedEventHandler capture = (_, _, _, _, settings, data, _) =>
        {
            body = JsonConvert.SerializeObject(data, settings);
            throw new OperationCanceledException("Request captured, not sent");
        };
        client.AddRequestPreparedHandler(capture);
        try
        {
            await Assert.ThrowsAnyAsync<Exception>(() => client.Table<Rating>().Upsert(rows.ToList()));
        }
        finally
        {
            client.RemoveRequestPreparedHandler(capture);
        }

        Assert.NotNull(body);
        // Read the raw strings: the default reader would convert them to local DateTime values
        using JsonTextReader reader = new(new StringReader(body)) { DateParseHandling = DateParseHandling.None };
        return JArray.Load(reader).Select(row => DateTimeOffset.Parse(row.Value<string>("date")!)).ToList();
    }
}
