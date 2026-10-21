using System.ComponentModel.DataAnnotations;
using api.Common;

namespace api.Models;

/// <summary>
/// Body of POST /api/auth/reset-password: the tokens of the reset password link and the new password. Invalid values
/// are rejected with a 400.
/// </summary>
/// <param name="AccessToken">access_token of the reset password link, sent by email by Supabase Auth.</param>
/// <param name="RefreshToken">refresh_token of the reset password link.</param>
/// <param name="Password">New password, following the same <see cref="StrongPasswordAttribute"/> rules as at sign
/// up.</param>
public record ResetPasswordRequest(
    [Required] string AccessToken,
    [Required] string RefreshToken,
    [Required, StrongPassword] string Password);
