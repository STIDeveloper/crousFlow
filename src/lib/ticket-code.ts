export const TICKET_SHORT_CODE_LENGTH = 6

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // sans 0/O ni 1/I pour la saisie manuelle

/** Code lisible affiché sous le QR, dérivé de façon stable de l'identifiant (hash FNV-1a). */
export function ticketShortCode(reservationId: string): string {
  let hash = 0x811c9dc5
  for (let index = 0; index < reservationId.length; index++) {
    hash ^= reservationId.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  // 32 symboles = 5 bits par caractère : 6 caractères consomment 30 bits du hash.
  let code = ''
  for (let index = 0; index < TICKET_SHORT_CODE_LENGTH; index++) {
    code += ALPHABET[(hash >>> (index * 5)) & 31]
  }
  return code
}

export function isTicketShortCode(value: string): boolean {
  return new RegExp(`^[${ALPHABET}]{${TICKET_SHORT_CODE_LENGTH}}$`).test(value.toUpperCase())
}
