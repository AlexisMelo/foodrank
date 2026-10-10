using api.Models;

namespace Api.Tests.Models;

/// <summary>
/// Tests the mapping of a tierlist creation request to the row inserted in the database.
/// </summary>
public class CreateTierlistRequestTests
{
    /// <summary>
    /// The emoji, the pinned flag and the user id are copied, and the name is trimmed.
    /// </summary>
    [Fact]
    public void ToTierlist_ValidRequest_CopiesFieldsAndTrimsName()
    {
        CreateTierlistRequest request = new("👨‍🍳", "  Chef's picks ", "Only the best", true);

        Tierlist tierlist = request.ToTierlist("user-1");

        Assert.Equal("user-1", tierlist.UserId);
        Assert.Equal("👨‍🍳", tierlist.Emoji);
        Assert.Equal("Chef's picks", tierlist.Name);
        Assert.Equal("Only the best", tierlist.Description);
        Assert.True(tierlist.Pinned);
    }

    /// <summary>
    /// A missing or blank description is stored as no description.
    /// </summary>
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("  \n ")]
    public void ToTierlist_BlankDescription_IsNull(string? description)
    {
        CreateTierlistRequest request = new("🏆", "Top 10", description, false);

        Assert.Null(request.ToTierlist("user-1").Description);
    }

    /// <summary>
    /// The description is stored without the spaces around it.
    /// </summary>
    [Fact]
    public void ToTierlist_PaddedDescription_IsTrimmed()
    {
        CreateTierlistRequest request = new("🏆", "Top 10", "  Late night spots \n", false);

        Assert.Equal("Late night spots", request.ToTierlist("user-1").Description);
    }

    /// <summary>
    /// The id and the creation date are left to the database.
    /// </summary>
    [Fact]
    public void ToTierlist_ValidRequest_LeavesIdAndCreationDateUnset()
    {
        Tierlist tierlist = new CreateTierlistRequest("🏆", "Top 10", null, false).ToTierlist("user-1");

        Assert.Equal(0, tierlist.Id);
        Assert.Equal(default, tierlist.CreatedAt);
    }
}
