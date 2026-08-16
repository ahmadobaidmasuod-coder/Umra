export class AppError extends Error {
  constructor(public readonly code: string, message: string, public readonly status: number, public readonly details?: unknown) {
    super(message);
    this.name = "AppError";
  }
}
export class NotFoundError extends AppError { constructor(message = "المورد غير موجود") { super("NOT_FOUND", message, 404); } }
export class ForbiddenError extends AppError { constructor(message = "غير مصرح") { super("FORBIDDEN", message, 403); } }
export class ValidationError extends AppError { constructor(details: unknown) { super("VALIDATION_ERROR", "البيانات غير صالحة", 400, details); } }
