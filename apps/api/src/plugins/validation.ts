import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { ZodSchema, ZodError } from 'zod';

// Validation error formatter
function formatZodError(error: ZodError): { code: string; message: string; details: unknown } {
  const firstError = error.errors[0];
  return {
    code: 'VALIDATION_ERROR',
    message: firstError?.message || 'Validation failed',
    details: error.errors.map((err) => ({
      path: err.path.join('.'),
      message: err.message,
    })),
  };
}

// Validation plugin
const validationPlugin: FastifyPluginAsync = async (fastify) => {
  // Decorate fastify with validate method
  fastify.decorate('validate', function <T extends ZodSchema>(
    schema: T,
    source?: 'body' | 'query' | 'params'
  ) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Handle nested schemas (e.g., { body: z.object(...) })
        const shape = (schema as { shape?: Record<string, unknown> }).shape;
        if (shape && ('body' in shape || 'query' in shape || 'params' in shape)) {
          // Validate all parts
          const validated = await schema.parseAsync({
            body: request.body,
            query: request.query,
            params: request.params,
          });

          // Assign validated data back to request
          if (validated.body) request.body = validated.body;
          if (validated.query) request.query = validated.query as any;
          if (validated.params) request.params = validated.params as any;
        } else {
          // Single source validation
          const sourceType = source || 'body';
          let dataToValidate: unknown;

          switch (sourceType) {
            case 'body':
              dataToValidate = request.body;
              break;
            case 'query':
              dataToValidate = request.query;
              break;
            case 'params':
              dataToValidate = request.params;
              break;
          }

          // Validate the data
          const validated = await schema.parseAsync(dataToValidate);

          // Assign validated data back to request
          if (sourceType === 'body') {
            request.body = validated;
          } else if (sourceType === 'query') {
            request.query = validated as any;
          } else if (sourceType === 'params') {
            request.params = validated as any;
          }
        }
      } catch (error) {
        if (error instanceof ZodError) {
          return reply.code(400).send({
            success: false,
            error: formatZodError(error),
          });
        }
        throw error;
      }
    };
  });
};

// Type declaration for the decorator
declare module 'fastify' {
  interface FastifyInstance {
    validate: <T extends ZodSchema>(
      schema: T,
      source?: 'body' | 'query' | 'params'
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void | FastifyReply>;
  }
}

export default validationPlugin;
