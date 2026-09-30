using api.Common;
using api.Models;
using api.Services.Places;
using Supabase.Postgrest;
using Supabase.Postgrest.Responses;

namespace api.Services;

/// <summary>
/// Reads restaurants from the database and creates them from places selected in the search.
/// </summary>
public class RestaurantService(Supabase.Client supabase, IPlaceProvider placeProvider) : IRestaurantService
{
    /// <summary>
    /// Emoji given to restaurants created from a place, until the cuisine type is handled.
    /// </summary>
    private const string DefaultEmoji = "🍽️";

    /// <inheritdoc />
    public async Task<IReadOnlyList<Restaurant>> GetAllAsync(CancellationToken cancellationToken)
    {
        ModeledResponse<Restaurant> response = await supabase.From<Restaurant>().Get(cancellationToken);
        return response.Models;
    }

    /// <inheritdoc />
    public async Task<Result<Restaurant>> GetOrCreateFromPlaceAsync(string placeId, CancellationToken cancellationToken)
    {
        Restaurant? existing = await FindByOsmIdAsync(placeId, cancellationToken);
        if (existing is not null)
            return Result<Restaurant>.Success(existing);

        Result<PlaceDetails> details = await placeProvider.GetDetailsAsync(placeId, cancellationToken);
        if (!details.IsSuccess)
            return Result<Restaurant>.Failure(details.Error!);

        // Ignoring duplicates on the unique osm_id index handles two users creating the same restaurant concurrently.
        QueryOptions options = new()
        {
            OnConflict = "osm_id",
            DuplicateResolution = QueryOptions.DuplicateResolutionType.IgnoreDuplicates
        };
        ModeledResponse<Restaurant> inserted = await supabase.From<Restaurant>().Upsert(ToRestaurant(details.Value!), options, cancellationToken);

        Restaurant? saved = inserted.Models.FirstOrDefault() ?? await FindByOsmIdAsync(placeId, cancellationToken);
        return saved is null
            ? Result<Restaurant>.Failure(new Error(ErrorType.Unavailable, "Could not save the restaurant."))
            : Result<Restaurant>.Success(saved);
    }

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
