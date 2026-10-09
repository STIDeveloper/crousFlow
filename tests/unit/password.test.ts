import { describe, expect, it } from 'vitest'
import { hashPassword, verifyPassword } from '../../src/server/auth/password'

describe('password hashing', () => {
  it('never stores a plaintext password and verifies the original password', async () => {
    const password = 'CrousFlow2026!'
    const encoded = await hashPassword(password)

    expect(encoded).toMatch(/^scrypt\$16384\$8\$1\$/)
    expect(encoded).not.toContain(password)
    await expect(verifyPassword(password, encoded)).resolves.toBe(true)
  })

  it('rejects an incorrect password and malformed hash', async () => {
    const encoded = await hashPassword('CrousFlow2026!')

    await expect(verifyPassword('WrongPassword2026!', encoded)).resolves.toBe(false)
    await expect(verifyPassword('CrousFlow2026!', 'plaintext')).resolves.toBe(false)
  })
})
