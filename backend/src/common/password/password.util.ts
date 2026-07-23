/**
 * Hashing de senhas com Argon2id (padrão atual) + compatibilidade bcrypt legado.
 *
 * Estratégia de migração transparente:
 *   - Novas senhas → Argon2id
 *   - Senhas bcrypt existentes → verificadas com bcrypt, rehash para Argon2id no próximo login bem-sucedido
 *   - Sem necessidade de reset forçado de senhas
 */
import * as argon2 from 'argon2'
import * as bcrypt from 'bcryptjs'

// OWASP 2024: memCost=64MB, timeCost=3, parallelism=4
export const ARGON2_OPTIONS: argon2.Options = {
  type:        argon2.argon2id,
  memoryCost:  64 * 1024,  // 64 MB
  timeCost:    3,
  parallelism: 4,
}

export async function hashPassword(plaintext: string): Promise<string> {
  return argon2.hash(plaintext, ARGON2_OPTIONS)
}

/**
 * Verifica a senha contra o hash armazenado (argon2 ou bcrypt legado).
 * Retorna `needsRehash=true` quando o hash é bcrypt — o caller deve
 * atualizá-lo para Argon2 na mesma transação do login bem-sucedido.
 */
export async function verifyPassword(
  plaintext: string,
  stored: string,
): Promise<{ valid: boolean; needsRehash: boolean }> {
  if (stored.startsWith('$argon2')) {
    const valid = await argon2.verify(stored, plaintext)
    return { valid, needsRehash: false }
  }
  // Hash bcrypt legado
  const valid = await bcrypt.compare(plaintext, stored)
  return { valid, needsRehash: valid }
}

/** Hash bcrypt para dummy — previne timing attack quando usuário não existe */
export const DUMMY_ARGON2_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$dummysaltdummysalt$dummyhashtopreventtimingattackdummyhash'
