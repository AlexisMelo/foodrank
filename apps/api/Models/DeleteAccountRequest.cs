using System.ComponentModel.DataAnnotations;

namespace api.Models;

/// <summary>
/// Body of POST /api/auth/delete-account. A missing password is rejected with a 400.
/// </summary>
/// <param name="Password">Current password of the logged-in user, confirming the deletion.</param>
public record DeleteAccountRequest([Required] string Password);
