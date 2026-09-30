using System.Threading.RateLimiting;
using api.Common;
using api.Services;
using api.Services.Places;
using api.Services.Places.Osm;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddNewtonsoftJson();
builder.Services.AddOpenApi();

builder.Services.AddSingleton(_ =>
{
    Supabase.Client client = new(
        builder.Configuration["Supabase:Url"]!,
        builder.Configuration["Supabase:ServiceRoleKey"]!,
        new Supabase.SupabaseOptions { AutoRefreshToken = false, AutoConnectRealtime = false }
    );
    client.InitializeAsync().GetAwaiter().GetResult();
    return client;
});

builder.Services.AddScoped<ISupabaseAuthService, SupabaseAuthService>();

// Place search: Photon (OpenStreetMap). Swap the IPlaceProvider registration to change provider.
string placesUserAgent = builder.Configuration["Places:UserAgent"]!;
builder.Services.AddMemoryCache();
builder.Services.AddHttpClient<NominatimClient>(client =>
{
    client.BaseAddress = new Uri(builder.Configuration["Places:NominatimBaseUrl"]!);
    client.DefaultRequestHeaders.TryAddWithoutValidation("User-Agent", placesUserAgent);
});
builder.Services.AddHttpClient<IPlaceProvider, PhotonPlaceProvider>(client =>
{
    client.BaseAddress = new Uri(builder.Configuration["Places:PhotonBaseUrl"]!);
    client.DefaultRequestHeaders.TryAddWithoutValidation("User-Agent", placesUserAgent);
});
builder.Services.AddScoped<IPlaceSearchService, PlaceSearchService>();
builder.Services.AddScoped<IRestaurantService, RestaurantService>();

//Rate limiting for endpoints calling the free OSM services, so abuse can't get our server throttled or banned.
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy(RateLimitPolicies.Places, context => RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 30, Window = TimeSpan.FromMinutes(1) }));
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy
            .WithOrigins(builder.Configuration["Frontend:Url"]!)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseCors("Frontend");
app.UseRateLimiter();
app.UseAuthorization();
app.MapControllers();

app.Run();
