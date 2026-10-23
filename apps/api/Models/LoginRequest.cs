namespace api.Models;

/// <summary>
/// Body of POST /api/auth/login: the credentials of the account.
/// </summary>
/// <param name="Email">Email address of the account.</param>
/// <param name="Password">Password of the account.</param>
public record LoginRequest(string Email, string Password);
