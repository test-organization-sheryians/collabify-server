export class WebhookProcessingError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly safe: boolean = false
  ) {
    super(message);
    this.name = "WebhookProcessingError";
  }
}

export class WebhookValidationError extends WebhookProcessingError {
  constructor(message: string, code: string = "VALIDATION_ERROR") {
    super(message, code, 400, true);
    this.name = "WebhookValidationError";
  }
}

export class WebhookNotFoundError extends WebhookProcessingError {
  constructor(provider: string, eventType: string) {
    super(
      `No handler registered for ${provider} event: ${eventType}`,
      "HANDLER_NOT_FOUND",
      500,
      true
    );
    this.name = "WebhookNotFoundError";
  }
}