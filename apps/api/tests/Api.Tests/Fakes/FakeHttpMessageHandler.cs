using System.Net;
using System.Text;

namespace Api.Tests.Fakes;

/// <summary>
/// HTTP handler answering every request with the same JSON body, replacing Photon and Nominatim in tests.
/// </summary>
/// <param name="responseJson">Body of every response, sent with a 200.</param>
public class FakeHttpMessageHandler(string responseJson) : HttpMessageHandler
{
    /// <summary>
    /// Answers <paramref name="request"/> with <paramref name="responseJson"/>, without any network call.
    /// </summary>
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        => Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(responseJson, Encoding.UTF8, "application/json")
        });

    /// <summary>
    /// Creates an HTTP client sending its requests to a fake server answering <paramref name="responseJson"/>.
    /// </summary>
    public static HttpClient Client(string responseJson) => new(new FakeHttpMessageHandler(responseJson))
    {
        BaseAddress = new Uri("http://osm.test/")
    };
}
