namespace api.Models;

public record ResetPasswordRequest(string AccessToken, string RefreshToken, string Password);
