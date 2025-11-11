const { AppError, InternalServerError } = require('./appError');

class ErrorHandler {
  handleError(error, context, message) {
    if (error instanceof AppError) return error;
    return new InternalServerError(message, context, error);
  }
}

module.exports = new ErrorHandler();