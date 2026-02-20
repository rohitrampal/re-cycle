import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.code(401).send({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    });
  }
}

/**
 * Authorization middleware factory
 * Checks if user owns the resource
 */
export function authorize(ownerIdExtractor: (request: FastifyRequest) => string | Promise<string>) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const userId = (request.user as { id: string })?.id;
    if (!userId) {
      reply.code(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    const resourceOwnerId = await ownerIdExtractor(request);
    if (userId !== resourceOwnerId) {
      reply.code(403).send({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to access this resource',
        },
      });
    }
  };
}
