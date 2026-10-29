namespace api.Models;

/// <summary>
/// Body of the errors answered by the API: those of the services (400, 401, 403, 404, 409, 503, see
/// <see cref="Common.ResultExtensions"/>) and the unexpected ones (500, see <see cref="Common.GlobalExceptionHandler"/>),
/// e.g. <c>{"error": "User not found."}</c>. The 400 of an invalid body is the ASP.NET Core validation problem instead.
/// </summary>
/// <param name="Error">Explanation shown to the user.</param>
public record ErrorResponse(string Error);
