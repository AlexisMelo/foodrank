using api.Common;
using api.Models;
using api.Services.Places;
using Supabase.Postgrest.Exceptions;
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
    public async Task<Result<Restaurant>> GetOrCreateFromPlaceAsync(string placeId, CancellationToken cancellationToken)
    {
        //Check if already in base
        Restaurant? existing = await FindByOsmIdAsync(placeId, cancellationToken);
        if (existing is not null)
            return Result<Restaurant>.Success(existing);

        //Lookup on OSM
        Result<PlaceDetails> details = await placeProvider.GetDetailsAsync(placeId, cancellationToken);
        if (!details.IsSuccess)
            return Result<Restaurant>.Failure(details.Error!);

        // Insert, not upsert: postgrest-csharp always sends the primary key on upserts ("id": "", rejected by the uuid
        // column), while an insert lets the database generate it. If another request created the same restaurant
        // in the meantime, the unique index on osm_id rejects this insert and we read the existing row instead.
        Restaurant? saved;
        try
        {
            ModeledResponse<Restaurant> inserted = await supabase.From<Restaurant>().Insert(ToRestaurant(details.Value!), cancellationToken: cancellationToken);
            saved = inserted.Models.FirstOrDefault() ?? await FindByOsmIdAsync(placeId, cancellationToken);
        }
        catch (PostgrestException ex) when (PostgrestErrors.IsUniqueViolation(ex))
        {
            saved = await FindByOsmIdAsync(placeId, cancellationToken);
        }

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
