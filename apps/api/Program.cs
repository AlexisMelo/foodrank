var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
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

builder.Services.AddScoped<api.Services.ISupabaseAuthService, api.Services.SupabaseAuthService>();

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
app.UseAuthorization();
app.MapControllers();

app.Run();
