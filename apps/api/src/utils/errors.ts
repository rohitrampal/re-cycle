import { FastifyReply } from 'fastify';

export enum ErrorCode {
  // Authentication
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  UNAUTHORIZED = 'UNAUTHORIZED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  
  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  
  // Resources
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  FORBIDDEN = 'FORBIDDEN',
  
  // Server
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
}

export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: unknown;
  statusCode?: number;
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(code: ErrorCode, message: string, statusCode = 500, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function sendError(reply: FastifyReply, error: AppError | Error, isProduction = false): void {
  if (error instanceof AppError) {
    reply.code(error.statusCode).send({
      success: false,
      error: {
        code: error.code,
        message: isProduction && error.statusCode >= 500 
          ? 'An internal error occurred' 
          : error.message,
        ...(error.details != null && !isProduction ? { details: error.details } : {}),
      },
    });
  } else {
    // Unknown error - don't expose details in production
    reply.code(500).send({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: isProduction 
          ? 'An internal error occurred' 
          : error.message,
      },
    });
  }
}
