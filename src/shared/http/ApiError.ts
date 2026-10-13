/** Error envelope every API failure uses: `{ error: { code, message } }`. */
export interface ApiErrorEnvelope {
  error: { code: string; message: string };
}

/** Typed transport/business error thrown by the HTTP adapters. */
export class ApiError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

/**
 * Builds an ApiError from a non-2xx Response. Parses the shared envelope when
 * present; falls back to a generic message for non-JSON or malformed bodies so
 * callers always receive an `ApiError`, never a raw SyntaxError.
 */
export async function apiErrorFrom(response: Response): Promise<ApiError> {
  try {
    const body = (await response.json()) as Partial<ApiErrorEnvelope> | null;
    const code = body?.error?.code;
    const message = body?.error?.message;
    if (typeof code === 'string' && code.length > 0) {
      return new ApiError(code, typeof message === 'string' ? message : code);
    }
  } catch {
    // Non-JSON body: fall through to the status fallback.
  }
  // Session-expiry codes: a 401/403 tells the store to drop the token even
  // when the body is not the shared envelope (proxy, gateway, malformed JSON).
  if (response.status === 401 || response.status === 403) {
    return new ApiError('unauthorized', `Request failed with status ${response.status}.`);
  }
  return new ApiError('unknown', `Request failed with status ${response.status}.`);
}
