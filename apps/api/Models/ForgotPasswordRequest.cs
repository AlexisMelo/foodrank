namespace api.Models;

/// <summary>
/// Body of POST /api/auth/forgot-password: the account to send a reset password link to.
/// </summary>
/// <param name="Email">Email address of the account.</param>
public record ForgotPasswordRequest(string Email);
