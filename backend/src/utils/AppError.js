// Represents an expected, "handled" failure (bad input, wrong credentials, etc.)
// as opposed to a bug. The error handler middleware uses `statusCode` to reply
// correctly and `isOperational` to decide what's safe to show the client.
export class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}
