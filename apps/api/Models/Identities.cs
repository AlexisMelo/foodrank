namespace api.Models;

/// <summary>
/// Values of <see cref="Profile.Identity"/>, chosen by the user when signing up.
/// </summary>
public static class Identities
{
    /// <summary>
    /// The user identifies as a man.
    /// </summary>
    public const string Man = "man";

    /// <summary>
    /// The user identifies as a woman.
    /// </summary>
    public const string Woman = "woman";

    /// <summary>
    /// The user identifies as non-binary.
    /// </summary>
    public const string NonBinary = "non_binary";
}
