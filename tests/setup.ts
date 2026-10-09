import '@testing-library/jest-dom/vitest'
import { TransformStream } from 'node:stream/web'

process.env.QR_SECRET = 'test-qr-secret-that-is-at-least-32-characters-long'
process.env.SESSION_SECRET = 'test-session-secret-that-is-at-least-32-chars'

if (!globalThis.TransformStream) {
  Object.defineProperty(globalThis, 'TransformStream', {
    configurable: true,
    value: TransformStream,
    writable: true,
  })
}
