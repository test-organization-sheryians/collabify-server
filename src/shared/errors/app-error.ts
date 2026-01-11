import { ErrorCode } from "./error-codes";

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly httpStatus: number;
  public readonly isOperational: boolean;
  public readonly metadata?: Record<string, unknown>;

  constructor(
    message: string,
    code: ErrorCode = "INTERNAL_SERVER_ERROR",
    httpStatus = 500,
    isOperational = true,
    metadata?: Record<string, unknown>
  ) {
    super(message);
    this.code = code;
    this.httpStatus = httpStatus;
    this.isOperational = isOperational;
    this.metadata = metadata;
    this.name = "AppError";

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, code: ErrorCode = "BAD_REQUEST") {
    return new AppError(message, code, 400);
  }

  static unauthorized(
    message = "Unauthorized",
    code: ErrorCode = "UNAUTHORIZED"
  ) {
    return new AppError(message, code, 401);
  }

  static forbidden(message = "Forbidden", code: ErrorCode = "FORBIDDEN") {
    return new AppError(message, code, 403);
  }

  static notFound(message = "Not Found", code: ErrorCode = "NOT_FOUND") {
    return new AppError(message, code, 404);
  }

  static conflict(message: string, code: ErrorCode = "CONFLICT") {
    return new AppError(message, code, 409);
  }
}
