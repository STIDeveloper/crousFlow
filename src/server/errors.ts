export type AppErrorCode =
  | 'SLOT_FULL'
  | 'DUPLICATE_RESERVATION'
  | 'WINDOW_CLOSED'
  | 'QTY_INVALID'
  | 'DATE_OUT_OF_RANGE'
  | 'DATE_IN_PAST'
  | 'FIELD_TOO_LONG'
  | 'CONTENT_NOT_ALLOWED'
  | 'BAD_JSON'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'UNAUTHORIZED'
  | 'QR_INVALID'
  | 'ALREADY_CONSUMED'
  | 'PAYLOAD_TOO_LARGE'
  | 'SERVICE_UNAVAILABLE'
  | 'RATE_LIMITED'

export const ErrorStatusMap: Record<AppErrorCode, number> = {
  SLOT_FULL: 409,
  DUPLICATE_RESERVATION: 409,
  WINDOW_CLOSED: 409,
  ALREADY_CONSUMED: 409,
  QTY_INVALID: 422,
  DATE_OUT_OF_RANGE: 422,
  DATE_IN_PAST: 422,
  FIELD_TOO_LONG: 422,
  CONTENT_NOT_ALLOWED: 422,
  VALIDATION_ERROR: 422,
  BAD_JSON: 400,
  QR_INVALID: 400,
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  UNAUTHORIZED: 401,
  PAYLOAD_TOO_LARGE: 413,
  SERVICE_UNAVAILABLE: 503,
  RATE_LIMITED: 429,
}

export class AppError extends Error {
  public status: number
  constructor(
    public code: AppErrorCode,
    message: string,
    status?: number,
    public details?: unknown,
  ) {
    super(message)
    this.name = 'AppError'
    this.status = status ?? ErrorStatusMap[code] ?? 500
  }
}

export function toHttpResponse(
  err: unknown,
  requestId: string,
): {
  status: number
  body: { code: string; message: string; details?: unknown; requestId: string }
} {
  if (err instanceof AppError) {
    return {
      status: err.status,
      body: {
        code: err.code,
        message: err.message,
        details: err.details,
        requestId,
      },
    }
  }

  return {
    status: 500,
    body: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Une erreur inattendue est survenue.',
      requestId,
    },
  }
}
