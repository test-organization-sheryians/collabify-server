import { AppError } from "@/shared/errors";
import { ErrorCode } from "@/shared/errors/error-codes";

export class NotificationError extends AppError {
  constructor(
    message: string,
    code: ErrorCode = "INTERNAL_SERVER_ERROR",
    statusCode = 500,
    public safeContext?: Record<string, unknown>
  ) {
    super(message, code, statusCode, true, safeContext);
    this.name = "NotificationError";
  }
}

export class RateLimitExceededError extends NotificationError {
  constructor(userId: string) {
    super("Notification Rate Limit Exceeded", "RATE_LIMIT_EXCEEDED", 429, {
      userId,
    });
  }
}

export class ProviderError extends NotificationError {
  constructor(provider: string, originalError: unknown) {
    super(
      `Failed to send via ${provider}`,
      "NOTIFICATION_PROVIDER_ERROR",
      502,
      {
        provider,
        originalError:
          originalError instanceof Error
            ? originalError.message
            : String(originalError),
      }
    );
  }
}

export class TemplateNotFoundError extends NotificationError {
  constructor(templateId: string) {
    super(`Template ${templateId} not found`, "TEMPLATE_NOT_FOUND", 404, {
      templateId,
    });
  }
}

export class NotificationNotFoundError extends NotificationError {
  constructor(id: string) {
    super(`Notification ${id} not found`, "NOTIFICATION_NOT_FOUND", 404, {
      id,
    });
  }
}
