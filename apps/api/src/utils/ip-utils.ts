import { FastifyRequest } from 'fastify';

/**
 * Extract client IP address from request
 * Handles proxies and load balancers (X-Forwarded-For header)
 */
export function getClientIp(request: FastifyRequest): string {
  // Check X-Forwarded-For header (first IP in chain)
  const forwardedFor = request.headers['x-forwarded-for'];
  if (forwardedFor) {
    const ips = typeof forwardedFor === 'string' ? forwardedFor.split(',') : forwardedFor;
    const firstIp = ips[0]?.trim();
    if (firstIp) return firstIp;
  }

  // Check X-Real-IP header (set by nginx/proxy)
  const realIp = request.headers['x-real-ip'];
  if (realIp && typeof realIp === 'string') {
    return realIp;
  }

  // Fallback to socket remote address
  return request.socket.remoteAddress || 'unknown';
}

/**
 * Check if IP address is valid IPv4 or IPv6
 */
export function isValidIp(ip: string): boolean {
  // IPv4 regex
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  // IPv6 regex (simplified)
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}
