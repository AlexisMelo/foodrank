using api.Models;

namespace Api.Tests.Models;

/// <summary>
/// Tests the mapping of a sign up request to the profile row saved for the new account.
/// </summary>
public class SignupRequestTests
{
    /// <summary>
    /// The user id, pseudonym and identity are copied, and the age is replaced by the birth year.
    /// </summary>
    [Fact]
    public void ToProfile_ValidRequest_CopiesFieldsAndComputesBirthYear()
    {
        SignupRequest request = new("me@test.fr", "abcdefg1", "alex", 30, Identities.NonBinary);

        Profile profile = request.ToProfile("user-1", 2026);

        Assert.Equal("user-1", profile.Id);
        Assert.Equal("alex", profile.Username);
        Assert.Equal(1996, profile.BirthYear);
        Assert.Equal(Identities.NonBinary, profile.Identity);
        Assert.Null(profile.AvatarUrl);
    }

    /// <summary>
    /// An age of 0 gives the current year.
    /// </summary>
    [Fact]
    public void ToProfile_AgeZero_BornThisYear()
    {
        SignupRequest request = new("me@test.fr", "abcdefg1", "alex", 0, Identities.Woman);

        Assert.Equal(2026, request.ToProfile("user-1", 2026).BirthYear);
    }
}
