/**
 * Validation helpers for the ReCycle frontend.
 * Central place for numeric, phone, and email validation.
 */

/** Indian mobile number: +91XXXXXXXXXX or 10-digit starting 6–9. */
const INDIAN_MOBILE_REGEX = /^(?:\+91[6-9]\d{9}|[6-9]\d{9})$/;

/** Validate Indian phone number. Empty string is treated as valid for optional fields. */
export function validatePhone(value: string): { valid: boolean; message?: string } {
  const raw = value.trim();
  if (raw === "") return { valid: true };

  // Only allow + and digits in the input
  if (!/^[+\d]+$/.test(raw)) {
    return { valid: false, message: "errors.invalidPhone" };
  }

  const normalized = raw.replace(/\s|-/g, "");

  if (INDIAN_MOBILE_REGEX.test(normalized)) {
    return { valid: true };
  }

  return { valid: false, message: "errors.invalidPhone" };
}

/** Normalize phone to digits-only (strip + and spaces) for API. */
export function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

/** Basic email format validation for frontend forms. */
export function validateEmail(value: string): { valid: boolean; message?: string } {
  const raw = value.trim();
  if (raw === "") {
    return { valid: true };
  }
  // Simple but robust RFC5322-inspired pattern; backend does stricter validation.
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!EMAIL_REGEX.test(raw)) {
    return { valid: false, message: "errors.invalidEmail" };
  }
  return { valid: true };
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
