namespace api.Common;

/// <summary>
/// Names of the rate limiting policies registered in Program.cs.
/// </summary>
public static class RateLimitPolicies
{
    /// <summary>
    /// Per-IP limit on endpoints calling the free OSM services, so abuse can't get our server throttled or banned.
    /// </summary>
    public const string Places = "places";
}
