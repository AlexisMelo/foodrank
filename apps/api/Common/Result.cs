namespace api.Common;

/// <summary>
/// Category of a failure, used to map a <see cref="Result{T}"/> to an HTTP status code.
/// </summary>
public enum ErrorType
{
    NotFound,
    Unavailable
}

/// <summary>
/// Describes why an operation failed.
/// </summary>
public record Error(ErrorType Type, string Message);

/// <summary>
/// Outcome of an operation: either a value or an <see cref="Error"/>. Used instead of exceptions for expected failures.
/// </summary>
public record Result<T>
{
    public T? Value { get; }
    public Error? Error { get; }
    public bool IsSuccess => Error is null;

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
