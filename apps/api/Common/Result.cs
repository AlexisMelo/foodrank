namespace api.Common;

/// <summary>
/// Category of a failure, used to map a <see cref="Result{T}"/> to an HTTP status code.
/// </summary>
public enum ErrorType
{
    /// <summary>
    /// The requested resource does not exist (HTTP 404).
    /// </summary>
    NotFound,

    /// <summary>
    /// A dependency (database, external service) failed or is unreachable (HTTP 503).
    /// </summary>
    Unavailable,

    /// <summary>
    /// The request needs a logged-in user (HTTP 401).
    /// </summary>
    Unauthorized,

    /// <summary>
    /// The logged-in user is not allowed to change the resource (HTTP 403).
    /// </summary>
    Forbidden,

    /// <summary>
    /// The request data is invalid (HTTP 400).
    /// </summary>
    Validation,

    /// <summary>
    /// The operation conflicts with data already stored (HTTP 409).
    /// </summary>
    Conflict
}

/// <summary>
/// Describes why an operation failed.
/// </summary>
/// <param name="Type">Category of the failure.</param>
/// <param name="Message">Explanation returned to the client.</param>
public record Error(ErrorType Type, string Message);

/// <summary>
/// Outcome of an operation: either a value or an <see cref="Error"/>. Used instead of exceptions for expected failures.
/// </summary>
public record Result<T>
{
    /// <summary>
    /// Value produced by the operation; only meaningful when <see cref="IsSuccess"/> is true.
    /// </summary>
    public T? Value { get; }

    /// <summary>
    /// Reason of the failure; null when the operation succeeded.
    /// </summary>
    public Error? Error { get; }

    /// <summary>
    /// True when the operation succeeded (no <see cref="Error"/>).
    /// </summary>
    public bool IsSuccess => Error is null;

    /// <summary>
    /// Private: use <see cref="Success"/> or <see cref="Failure"/> so a result is never both a value and an error.
    /// </summary>
    private Result(T? value, Error? error)
    {
        Value = value;
        Error = error;
    }

    /// <summary>
    /// Creates a successful result holding <paramref name="value"/>.
    /// </summary>
    public static Result<T> Success(T value) => new(value, null);

    /// <summary>
    /// Creates a failed result holding <paramref name="error"/>.
    /// </summary>
    public static Result<T> Failure(Error error) => new(default, error);
}
