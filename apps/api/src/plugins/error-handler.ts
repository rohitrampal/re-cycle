import { FastifyPluginAsync, FastifyError } from 'fastify';
import { AppError, ErrorCode, sendError } from '../utils/errors';
import { config } from '../config.js';
import { incrementErrorCount } from '../utils/metrics';
import { reportError } from '../utils/error-reporter';

const errorHandlerPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.setErrorHandler((error: FastifyError | AppError, request, reply) => {
    incrementErrorCount();
    const err = error as Error;
    const context = { url: request.url, method: request.method };
    const is5xx = error instanceof AppError ? error.statusCode >= 500 : true;
    if (err && is5xx) reportError(err, context);
    fastify.log.error({
      err: error,
      url: request.url,
      method: request.method,
    });

    // Handle known errors
    if (error instanceof AppError) {
      sendError(reply, error, config.isProduction);
      return;
    }

    // Handle validation errors
    if (error.validation) {
      reply.code(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          // Only expose validation details in development to prevent information disclosure
          details: config.isProduction ? undefined : error.validation,
        },
      });
      return;
    }

    // Handle JWT errors
    if (error.statusCode === 401) {
      reply.code(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    // Generic error
    sendError(
      reply,
      new AppError(
        ErrorCode.INTERNAL_ERROR,
        config.isProduction ? 'An internal error occurred' : (error as Error).message,
        500
      ),
      config.isProduction
    );
  });

  fastify.setNotFoundHandler((request, reply) => {
    incrementErrorCount();
    reply.code(404).send({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Resource not found',
      },
    });
  });
};

export default errorHandlerPlugin;
