/**
 * Criptografia de campos sensíveis — AES-256-GCM (autenticado)
 *
 * Uso:
 *   encrypt(plaintext)  → string opaca armazenada no banco
 *   decrypt(ciphertext) → plaintext original
 *   safeDecrypt(value)  → decrypt com fallback para plaintext legado
 *   hashToken(token)    → SHA-256 hex (para tokens de reset de senha)
 *
 * Requisito: variável de ambiente ENCRYPTION_KEY com ≥ 32 chars.
 * A chave derivada é cacheada em memória para performance.
 */
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, scryptSync } from 'crypto'

const ALG    = 'aes-256-gcm' as const
const SALT   = 'psicosaas-field-enc-v1'
const IV_LEN = 12   // GCM nonce recomendado
const TAG_LEN = 16  // tag de autenticação padrão do GCM
const SECRET_PREFIX = 'psicosaas.secret.v1:'

let _key: Buffer | null = null

/** Deriva e cacheia a chave de 256 bits a partir de ENCRYPTION_KEY */
function getKey(): Buffer {
  if (_key) return _key
  const secret = process.env.ENCRYPTION_KEY
  if (!secret || secret.length < 32) {
    throw new Error('[crypto] ENCRYPTION_KEY ausente ou muito curta (mínimo 32 chars)')
  }
  _key = scryptSync(secret, SALT, 32)
  return _key
}

/**
 * Criptografa um texto.
 * Formato de saída: base64url(iv).base64url(ciphertext).base64url(authTag)
 */
export function encrypt(text: string): string {
  const key    = getKey()
  const iv     = randomBytes(IV_LEN)
  const cipher = createCipheriv(ALG, key, iv, { authTagLength: TAG_LEN })
  const enc    = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  const tag    = cipher.getAuthTag()
  return [
    iv.toString('base64url'),
    enc.toString('base64url'),
    tag.toString('base64url'),
  ].join('.')
}

/**
 * Descriptografa um texto previamente criptografado por encrypt().
 * Lança exceção se o payload for inválido ou o MAC falhar.
 */
export function decrypt(payload: string): string {
  const parts = payload.split('.')
  if (parts.length !== 3) throw new Error('[crypto] Payload inválido')

  const [ivB64, encB64, tagB64] = parts
  const iv      = Buffer.from(ivB64,  'base64url')
  const enc     = Buffer.from(encB64, 'base64url')
  const tag     = Buffer.from(tagB64, 'base64url')
  const key     = getKey()
  const decipher = createDecipheriv(ALG, key, iv, { authTagLength: TAG_LEN })
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8')
}

/**
 * Descriptografa de forma segura.
 * Se o valor já está em plaintext (dados legados ou campo vazio), retorna como está.
 * Isso garante compatibilidade com dados existentes — na próxima edição serão criptografados.
 */
export function safeDecrypt(value: string | null | undefined): string | undefined {
  if (!value) return value ?? undefined
  try {
    return decrypt(value)
  } catch {
    // Dado legado em plaintext → retorna sem alteração
    return value
  }
}

export function encryptSecret(value: string): string {
  if (value.startsWith(SECRET_PREFIX)) return value
  return `${SECRET_PREFIX}${encrypt(value)}`
}

export function safeDecryptSecret(value: unknown): unknown {
  if (typeof value !== 'string') return value
  if (!value.startsWith(SECRET_PREFIX)) return value
  return safeDecrypt(value.slice(SECRET_PREFIX.length)) ?? value
}

/**
 * Retorna o SHA-256 hex de um token.
 * Usado para armazenar tokens de reset de senha sem expô-los no banco.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Gera um CSRF token stateless via HMAC-SHA256(JWT_SECRET, "csrf:" + userId).
 *
 * - Determinístico: mesma saída para o mesmo userId sem precisar de DB.
 * - Não é o JWT — não revela o token de sessão.
 * - Requer JWT_SECRET para forjar → atacante sem o secret não consegue replicar.
 * - Utilizado no padrão Synchronizer Token: retornado no body do login/me,
 *   armazenado em memória no frontend e enviado via header X-CSRF-Token.
 */
export function generateCsrfToken(userId: string): string {
  const secret = process.env.JWT_SECRET ?? ''
  return createHmac('sha256', secret).update(`csrf:${userId}`).digest('hex')
}
