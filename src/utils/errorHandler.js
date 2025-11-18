const { AppError, InternalServerError } = require('./appError');

class ErrorHandler {
  handleError(error, context, message) {
    if (error instanceof AppError) return error;
    return new InternalServerError(message, context, error);
  }

  handleControllerError(res, error, route, message) {
    const handledError = this.handleError(error, route, message);
    console.error(`Error in ${route}:\n`, handledError);
    const status = handledError.status || 500;
    const errorMessage = handledError.message || message || 'Internal Server Error';
    res.status(status).json({ error: errorMessage });
  }
}

module.exports = new ErrorHandler();