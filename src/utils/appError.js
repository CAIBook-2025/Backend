class AppError extends Error {
  constructor(message, context, status = 500, originalError = null) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.context = context;
    this.originalError = originalError;
    Error.captureStackTrace(this, this.constructor);
  }
}

class BadRequestError extends AppError {
  constructor(message = 'Solicitud inválida', context, originalError = null) {
    super(message, context, 400, originalError);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'No autorizado', context, originalError = null) {
    super(message, context, 401, originalError);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'No tienes permisos para acceder a este recurso.', context, originalError = null) {
    super(message, context, 403, originalError);
  }
}
 
class NotFoundError extends AppError {
  constructor(message = 'Recurso no encontrado', context, originalError = null) {
    super(message, context, 404, originalError);
  }
}

class ConflictError extends AppError {
  constructor(message = 'Conflicto en la solicitud', context, originalError = null) {
    super(message, context, 409, originalError);
  }
}

class InternalServerError extends AppError {
  constructor(message = 'Error interno del servidor', context, originalError = null) {
    super(message, context, 500, originalError);
  }
}

module.exports = {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  InternalServerError,
};