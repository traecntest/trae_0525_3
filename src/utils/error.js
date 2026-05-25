class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

class FeishuApiError extends AppError {
  constructor(message, feishuCode, statusCode = 500) {
    super(message, statusCode, 'FEISHU_API_ERROR');
    this.feishuCode = feishuCode;
  }
}

class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

class PermissionDeniedError extends AppError {
  constructor(message = 'Permission denied') {
    super(message, 403, 'PERMISSION_DENIED');
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

module.exports = {
  AppError,
  FeishuApiError,
  ValidationError,
  NotFoundError,
  PermissionDeniedError,
  UnauthorizedError,
};
