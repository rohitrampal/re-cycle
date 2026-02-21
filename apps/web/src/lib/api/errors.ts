/**
 * Parse user-friendly messages from API errors (Axios or API response shape).
 * Handles both { error: { message } } and top-level { message } (e.g. Fastify).
 */
export function getApiErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (error && typeof error === 'object' && 'response' in error) {
    const res = (error as { response?: { data?: unknown } }).response?.data;
    if (res && typeof res === 'object') {
      const d = res as Record<string, unknown>;
      const fromError = d.error && typeof d.error === 'object' && typeof (d.error as Record<string, unknown>).message === 'string'
        ? (d.error as Record<string, unknown>).message as string
        : null;
      const fromTop = typeof d.message === 'string' ? d.message : null;
      return fromError ?? fromTop ?? 'An error occurred';
    }
  }
  if (error && typeof error === 'object' && 'message' in error && typeof (error as { message: unknown }).message === 'string') {
    return (error as { message: string }).message;
  }
  return 'An error occurred';
}

/** Known API error message fragments -> i18n key (without namespace). Use with t(`errors.${key}`). */
const MESSAGE_TO_I18N: Record<string, string> = {
  'Invalid file type': 'uploadInvalidFileType',
  'Only JPEG, PNG, and WebP': 'uploadInvalidFileType',
  'File is empty or invalid': 'uploadFileEmpty',
  'File size exceeds': 'uploadFileTooLarge',
  'Maximum': 'uploadMaxFiles', // "Maximum 5 files allowed"
  'No file provided': 'uploadNoFile',
  'No files provided': 'uploadNoFile',
};

/**
 * Returns an i18n key for known API messages, or the original message.
 * Usage: setError(getApiErrorDisplayMessage(err, t)) or setError(t(getApiErrorDisplayMessage(err, t)));
 * If second arg is provided, returns translated string; otherwise returns i18n key or message.
 */
export function getApiErrorDisplayMessage(
  error: unknown,
  t?: (key: string) => string
): string {
  const message = getApiErrorMessage(error);
  for (const [fragment, key] of Object.entries(MESSAGE_TO_I18N)) {
    if (message.includes(fragment)) {
      const i18nKey = `errors.${key}`;
      return t ? t(i18nKey) : i18nKey;
    }
  }
  return message;
}
