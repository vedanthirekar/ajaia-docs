export const ERROR_STATUS = {
  UNAUTHENTICATED: 401,
  VALIDATION: 400,
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  VERSION_CONFLICT: 409,
  CONTENT_TOO_LARGE: 400,
  EMAIL_TAKEN: 409,
  UNSUPPORTED_FILE: 422,
  FILE_TOO_LARGE: 413,
  UNPARSEABLE_FILE: 422,
  SELF_SHARE: 400,
  ALREADY_SHARED: 409,
} as const;

export type ErrorCode = keyof typeof ERROR_STATUS;

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = ERROR_STATUS[code];
  }
}

export function isAppError(e: unknown): e is AppError {
  return e instanceof AppError;
}

/** Map any thrown value to the API error contract `{ error: { code, message } }`. */
export function errorResponse(e: unknown): Response {
  if (isAppError(e)) {
    return Response.json({ error: { code: e.code, message: e.message } }, { status: e.status });
  }
  console.error("[api] unhandled error", e);
  return Response.json(
    { error: { code: "INTERNAL", message: "Something went wrong. Please try again." } },
    { status: 500 },
  );
}
