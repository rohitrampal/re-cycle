/**
 * In-memory metrics for monitoring (request count, error count).
 * Can be replaced with a proper metrics backend later.
 */

let requestCount = 0;
let errorCount = 0;

export function incrementRequestCount(): void {
  requestCount += 1;
}

export function incrementErrorCount(): void {
  errorCount += 1;
}

export function getMetrics(): { requestCount: number; errorCount: number } {
  return { requestCount, errorCount };
}

export function resetMetrics(): void {
  requestCount = 0;
  errorCount = 0;
}
