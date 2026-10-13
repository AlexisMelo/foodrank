using System.Net;
using System.Net.Sockets;
using System.Text;
using api.Common;
using api.Models;
using api.Services;
using Microsoft.Extensions.Logging.Abstractions;

namespace Api.Tests.Services;

/// <summary>
/// Tests how <see cref="SupabaseAuthService"/> maps the Supabase Auth failures, against a local HTTP server answering
/// like Supabase Auth.
/// </summary>
public class SupabaseAuthServiceTests : IDisposable
{
    /// <summary>
    /// Local server standing for Supabase Auth.
    /// </summary>
    private readonly HttpListener _server = new();

    /// <summary>
    /// Base URL of <see cref="_server"/>.
    /// </summary>
    private readonly string _url;

    /// <summary>
    /// Starts the server on a free port.
    /// </summary>
    public SupabaseAuthServiceTests()
    {
        TcpListener portFinder = new(IPAddress.Loopback, 0);
        portFinder.Start();
        int port = ((IPEndPoint)portFinder.LocalEndpoint).Port;
        portFinder.Stop();

        _url = $"http://localhost:{port}";
        _server.Prefixes.Add($"{_url}/");
        _server.Start();
    }

    /// <summary>
    /// Stops the server.
    /// </summary>
    public void Dispose() => _server.Close();

    /// <summary>
    /// Answers the next request with <paramref name="statusCode"/> and the JSON <paramref name="body"/>.
    /// </summary>
    private async Task RespondAsync(int statusCode, string body)
    {
        HttpListenerContext context = await _server.GetContextAsync();
        byte[] content = Encoding.UTF8.GetBytes(body);
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";
        await context.Response.OutputStream.WriteAsync(content);
        context.Response.Close();
    }

    /// <summary>
    /// Creates the service, calling <see cref="_server"/> as Supabase Auth.
    /// </summary>
    private SupabaseAuthService CreateService() => new(
        new Supabase.Gotrue.Client(new Supabase.Gotrue.ClientOptions { Url = _url }),
        NullLogger<SupabaseAuthService>.Instance);

    /// <summary>
    /// A server-side failure of Supabase Auth (here a database trigger failing) becomes a 503 result with a generic
    /// message instead of an exception.
    /// </summary>
    [Fact]
    public async Task SignUp_DatabaseError_ReturnsUnavailable()
    {
        Task response = RespondAsync(500,
            """{"code":500,"error_code":"unexpected_failure","msg":"Database error saving new user","error_id":"01a13481"}""");

        Result<AuthSession> result = await CreateService().SignUpAsync("new@test.fr", "abcdefg1");
        await response;

        Assert.Equal(SupabaseAuthService.SignUpUnavailable, result.Error);
        Assert.Equal(ErrorType.Unavailable, result.Error!.Type);
    }
}
