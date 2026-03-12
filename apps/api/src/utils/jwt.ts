import { config } from '../config.js';
import { FastifyInstance } from 'fastify';

export function generateTokens(
  fastify: FastifyInstance,
  userId: string
): { accessToken: string; refreshToken: string } {
  const accessToken = fastify.jwt.sign(
    { id: userId },
    { expiresIn: config.jwtExpiresIn }
  );

  const refreshToken = fastify.jwt.sign(
    { id: userId },
    { expiresIn: config.refreshTokenExpiresIn }
  );

  return { accessToken, refreshToken };
}
