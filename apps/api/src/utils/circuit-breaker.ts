/**
 * Simple in-memory circuit breaker.
 * States: closed (normal) -> open (fail fast) after failureThreshold failures;
 * open -> half-open after resetTimeoutMs; half-open -> closed on success, -> open on failure.
 */

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeoutMs: number;
  name?: string;
}

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures = 0;
  private lastFailureTime = 0;
  private nextAttemptAllowed = 0;

  constructor(private readonly options: CircuitBreakerOptions) {}

  getState(): CircuitState {
    if (this.state === 'open' && Date.now() >= this.nextAttemptAllowed) {
      this.state = 'half-open';
    }
    return this.state;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const s = this.getState();
    if (s === 'open') {
      throw new Error(
        `CircuitBreaker[${this.options.name ?? 'default'}] is OPEN; failing fast`
      );
    }
    try {
      const result = await fn();
      if (this.state === 'half-open') {
        this.state = 'closed';
        this.failures = 0;
      }
      return result;
    } catch (err) {
      this.recordFailure();
      throw err;
    }
  }

  private recordFailure(): void {
    this.failures += 1;
    this.lastFailureTime = Date.now();
    if (this.state === 'half-open' || this.failures >= this.options.failureThreshold) {
      this.state = 'open';
      this.nextAttemptAllowed = Date.now() + this.options.resetTimeoutMs;
    }
  }

  getStats(): { state: CircuitState; failures: number } {
    return { state: this.getState(), failures: this.failures };
  }
}
