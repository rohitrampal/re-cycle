/**
 * Validation helpers for the ReCycle frontend.
 * Use for form validation so numeric fields never go below zero and phone is digits-only.
 */

/** Allow optional leading + then only digits; empty string is valid (optional field). */
const PHONE_NUMBERS_ONLY_REGEX = /^\+?[0-9]*$/;

/** After stripping + and spaces, phone must be only digits. */
export function isPhoneNumbersOnly(value: string): boolean {
  if (value.trim() === "") return true;
  const digitsOnly = value.replace(/^\+/, "").replace(/\s/g, "");
  return /^[0-9]+$/.test(digitsOnly);
}

/** Validate phone for registration: if provided, must contain only numbers (optional leading +). */
export function validatePhone(value: string): { valid: boolean; message?: string } {
  if (value.trim() === "") return { valid: true };
  if (!PHONE_NUMBERS_ONLY_REGEX.test(value)) {
    return { valid: false, message: "errors.invalidPhone" };
  }
  const digitsOnly = value.replace(/\D/g, "");
  if (digitsOnly.length === 0) {
    return { valid: false, message: "errors.invalidPhone" };
  }
  return { valid: true };
}

/** Normalize phone to digits-only (strip + and spaces) for API. */
export function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Ensures a numeric value is never less than 0.
 * Use for price, quantity, radius, minPrice, maxPrice, etc.
 */
export function ensureNonNegative(value: number | string): number {
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (Number.isNaN(n)) return 0;
  return Math.max(0, n);
}

/** Check if a string/number is a valid non-negative number. */
export function isNonNegative(value: number | string): boolean {
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (Number.isNaN(n)) return false;
  return n >= 0;
}
