import { Pool, PoolClient, QueryResult } from 'pg';
import { config } from '../config';
import { CircuitBreaker } from '../utils/circuit-breaker';

interface QueryOptions {
  timeout?: number;
  retries?: number;
}

class ImprovedDatabase {
  private pool: Pool;
  private readonly defaultTimeout = 30000; // 30 seconds
  private readonly defaultRetries = 3;
  private readonly circuitBreaker: CircuitBreaker;

  constructor() {
    this.circuitBreaker = new CircuitBreaker({
      name: 'database',
      failureThreshold: 5,
      resetTimeoutMs: 30000,
    });
    this.pool = new Pool({
      ...config.database,
      max: config.database.max || 20,
      min: 5, // Minimum connections
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      statement_timeout: 30000, // 30 seconds per statement
      query_timeout: 30000,
    });

    // Enhanced error handling
    this.pool.on('error', (err) => {
      console.error('Unexpected database pool error', err);
      // In production, send to monitoring service
    });

    this.pool.on('connect', () => {
      console.log('New database connection established');
    });
  }

  /**
   * Connect to database with retry logic
   */
  async connect(): Promise<void> {
    const maxRetries = 5;
    let retries = 0;

    while (retries < maxRetries) {
      try {
        await this.pool.query('SELECT NOW()');
        console.log('Database connected successfully');
        return;
      } catch (error) {
        retries++;
        if (retries >= maxRetries) {
          console.error('Database connection failed after retries:', error);
          throw error;
        }
        const delay = Math.min(1000 * Math.pow(2, retries), 10000); // Exponential backoff
        console.log(`Database connection failed, retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Execute query with timeout, retry logic, and circuit breaker
   */
  async query(
    text: string,
    params?: unknown[],
    options: QueryOptions = {}
  ): Promise<QueryResult> {
    return this.circuitBreaker.execute(() => this.runQuery(text, params, options));
  }

  private async runQuery(
    text: string,
    params?: unknown[],
    options: QueryOptions = {}
  ): Promise<QueryResult> {
    const timeout = options.timeout || this.defaultTimeout;
    const maxRetries = options.retries || this.defaultRetries;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const start = Date.now();
      try {
        const result = await Promise.race([
          this.pool.query(text, params),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Query timeout')), timeout)
          ),
        ]);

        const duration = Date.now() - start;
        if (duration > 1000) {
          console.warn('Slow query detected', { text: text.substring(0, 100), duration });
        }
        if (config.isDevelopment) {
          console.log('Executed query', {
            text: text.substring(0, 100),
            duration,
            rows: result.rowCount,
          });
        }
        return result;
      } catch (error) {
        lastError = error as Error;
        if (error instanceof Error && error.message.includes('timeout')) {
          throw new Error(`Query timeout after ${timeout}ms`);
        }
        if (attempt < maxRetries - 1) {
          const delay = Math.min(100 * Math.pow(2, attempt), 1000);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
    console.error('Query failed after retries', { text: text.substring(0, 100), error: lastError });
    throw lastError || new Error('Query failed');
  }

  getCircuitBreakerStats() {
    return this.circuitBreaker.getStats();
  }

  /**
   * Execute transaction with automatic rollback on error
   */
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Transaction rolled back', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Health check - verify database connectivity
   */
  async healthCheck(): Promise<{ healthy: boolean; latency?: number }> {
    const start = Date.now();
    try {
      await this.pool.query('SELECT 1');
      const latency = Date.now() - start;
      return { healthy: true, latency };
    } catch (error) {
      return { healthy: false };
    }
  }

  /**
   * Get pool statistics
   */
  getPoolStats() {
    return {
      total: this.pool.totalCount,
      idle: this.pool.idleCount,
      waiting: this.pool.waitingCount,
    };
  }

  getPool(): Pool {
    return this.pool;
  }

  /**
   * Gracefully close all connections
   */
  async close(): Promise<void> {
    await this.pool.end();
    console.log('Database connections closed');
  }
}

export const db = new ImprovedDatabase();
