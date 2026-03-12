/**
 * Optional error reporter for external services (e.g. Sentry).
 * Set REPORT_ERROR=1 and optionally SENTRY_DSN (or use Sentry SDK directly)
 * to enable. By default no-ops so the app works without any setup.
 */

import { config } from '../config.js';

let reportFn: ((error: Error, context?: Record<string, unknown>) => void) | null = null;

/**
 * Register a custom reporter (e.g. Sentry.captureException).
 * Call from server startup if you use Sentry:
 *   import * as Sentry from '@sentry/node';
 *   registerErrorReporter((err, ctx) => { Sentry.captureException(err, { extra: ctx }); });
 */
export function registerErrorReporter(
  fn: (error: Error, context?: Record<string, unknown>) => void
): void {
  reportFn = fn;
}

/**
 * Report an error to the configured reporter (no-op if none registered).
 * Call registerErrorReporter() at startup to plug in Sentry or another service.
 */
export function reportError(error: Error, context?: Record<string, unknown>): void {
  if (!reportFn) return;
  if (!config.isProduction && process.env.REPORT_ERROR !== '1') return;
  try {
    reportFn(error, context);
  } catch {
    // ignore reporter failures
  }
}
