import { rules } from '@/config/rules'
import { AppError } from '@/server/errors'

/** Parses a small JSON request body after enforcing the application payload limit. */
export async function readJsonBody(request: Request): Promise<unknown> {
  const length = request.headers.get('content-length')
  if (length) {
    const parsedLength = Number(length)
    if (
      !Number.isFinite(parsedLength) ||
      parsedLength < 0 ||
      parsedLength > rules.maxPayloadBytes
    ) {
      throw new AppError('PAYLOAD_TOO_LARGE', 'Corps de requête trop volumineux', 413)
    }
  }

  const text = await request.text()
  if (Buffer.byteLength(text, 'utf8') > rules.maxPayloadBytes) {
    throw new AppError('PAYLOAD_TOO_LARGE', 'Corps de requête trop volumineux', 413)
  }

  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new AppError('BAD_JSON', 'JSON malformé', 400)
  }
}
