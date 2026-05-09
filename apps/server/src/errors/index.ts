export enum ErrorCode {
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
}

export class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number = 500,
    public readonly errorCode: ErrorCode = ErrorCode.INTERNAL_SERVER_ERROR,
    public readonly isOperational: boolean = true,
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = 'Bad Request', errorCode: ErrorCode = ErrorCode.BAD_REQUEST) {
    super(message, 400, errorCode);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized', errorCode: ErrorCode = ErrorCode.UNAUTHORIZED) {
    super(message, 401, errorCode);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden', errorCode: ErrorCode = ErrorCode.FORBIDDEN) {
    super(message, 403, errorCode);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Not Found', errorCode: ErrorCode = ErrorCode.NOT_FOUND) {
    super(message, 404, errorCode);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Conflict', errorCode: ErrorCode = ErrorCode.CONFLICT) {
    super(message, 409, errorCode);
  }
}

export class ValidationError extends AppError {
  constructor(
    public readonly errors: unknown,
    message: string = 'Validation Error',
  ) {
    super(message, 422, ErrorCode.VALIDATION_ERROR);
  }
}
