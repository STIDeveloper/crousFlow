import crypto from 'node:crypto'
const KEY_LENGTH = 64
const SALT_BYTES = 16

function derivePasswordKey(
  password: string,
  salt: Buffer,
  options: { N: number; r: number; p: number; maxmem: number },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, KEY_LENGTH, options, (error, derivedKey) => {
      if (error) reject(error)
      else resolve(derivedKey)
    })
  })
}

/**
 * Produces a self-contained password hash. The format deliberately stores the
 * cost parameters so they can be raised without invalidating existing users.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(SALT_BYTES)
  const derived = await derivePasswordKey(password, salt, {
    N: 16_384,
    r: 8,
    p: 1,
    maxmem: 32 * 1024 * 1024,
  })

  return `scrypt$16384$8$1$${salt.toString('base64url')}$${derived.toString('base64url')}`
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [algorithm, n, r, p, saltValue, hashValue, ...rest] = encoded.split('$')
  if (
    algorithm !== 'scrypt' ||
    rest.length > 0 ||
    !saltValue ||
    !hashValue ||
    !/^\d+$/.test(n ?? '') ||
    !/^\d+$/.test(r ?? '') ||
    !/^\d+$/.test(p ?? '')
  ) {
    return false
  }

  try {
    const salt = Buffer.from(saltValue, 'base64url')
    const expected = Buffer.from(hashValue, 'base64url')
    if (salt.length < SALT_BYTES || expected.length !== KEY_LENGTH) return false
    const derived = await derivePasswordKey(password, salt, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: 32 * 1024 * 1024,
    })
    return crypto.timingSafeEqual(derived, expected)
  } catch {
    return false
  }
}
