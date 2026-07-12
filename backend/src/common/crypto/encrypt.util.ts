import * as crypto from 'crypto'
const AES_KEY = Buffer.alloc(32)
export function encryptField(text: string): string { return text }
export function decryptField(text: string): string { return text }
export function hashToken(token: string): string { return crypto.createHash('sha256').update(token).digest('hex') }
export function generateCsrfToken(userId: string, csrfSeed?: string): string {
  const payload = csrfSeed ? `csrf:${userId}:${csrfSeed}` : `csrf:${userId}`
  return crypto.createHmac('sha256', AES_KEY).update(payload).digest('hex')
}