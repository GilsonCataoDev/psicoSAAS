import { Injectable, Logger } from '@nestjs/common'
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'

/**
 * Abstração sobre S3/R2 para armazenamento de arquivos.
 *
 * Variáveis de ambiente necessárias:
 *   STORAGE_ENDPOINT        — ex: https://<account-id>.r2.cloudflarestorage.com
 *   STORAGE_BUCKET          — nome do bucket
 *   STORAGE_ACCESS_KEY_ID   — access key
 *   STORAGE_SECRET_ACCESS_KEY — secret key
 *   STORAGE_CDN_URL         — URL pública base (ex: https://cdn.usecognia.com.br) — só necessária para uploads públicos (avatar)
 *   STORAGE_REGION          — região (padrão: 'auto' para R2)
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name)
  private client: S3Client | null = null
  private bucket: string
  private cdnUrl: string

  constructor() {
    const endpoint  = process.env.STORAGE_ENDPOINT
    const bucket    = process.env.STORAGE_BUCKET
    const accessKey = process.env.STORAGE_ACCESS_KEY_ID
    const secretKey = process.env.STORAGE_SECRET_ACCESS_KEY
    this.bucket = bucket ?? ''
    this.cdnUrl = (process.env.STORAGE_CDN_URL ?? '').replace(/\/$/, '')

    if (endpoint && bucket && accessKey && secretKey) {
      this.client = new S3Client({
        endpoint,
        region: process.env.STORAGE_REGION ?? 'auto',
        credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
        forcePathStyle: true,
      })
    } else {
      this.logger.warn('STORAGE_* env vars not configured — uploads desabilitados')
    }
  }

  async upload(key: string, body: Buffer, contentType: string): Promise<string> {
    if (!this.client) throw new Error('Storage not configured')
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }))
    return `${this.cdnUrl}/${key}`
  }

  /**
   * Upload sem retornar URL pública — para objetos privados (ex.: anexos
   * clínicos) que nunca devem ser servidos via CDN/bucket público.
   */
  async uploadPrivate(key: string, body: Buffer, contentType: string): Promise<void> {
    if (!this.client) throw new Error('Storage not configured')
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }))
  }

  /**
   * Busca um objeto privado direto do bucket (sem expor URL) — o chamador
   * decide como servir os bytes (ex.: stream autenticado via controller).
   */
  async getObject(key: string): Promise<Buffer> {
    if (!this.client) throw new Error('Storage not configured')
    const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }))
    const stream = result.Body as NodeJS.ReadableStream
    const chunks: Buffer[] = []
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    return Buffer.concat(chunks)
  }

  async delete(key: string): Promise<void> {
    if (!this.client) return
    try {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }))
    } catch (err: any) {
      this.logger.warn(`StorageService.delete falhou para key=${key}: ${err?.message}`)
    }
  }

  /** Extrai a key de uma URL de CDN gerada por este serviço */
  keyFromUrl(url: string): string | null {
    if (!this.cdnUrl || !url.startsWith(this.cdnUrl)) return null
    return url.slice(this.cdnUrl.length + 1)
  }

  isConfigured(): boolean {
    return this.client !== null && Boolean(this.cdnUrl)
  }

  /** Uploads privados (sem CDN) só precisam de bucket + credenciais + endpoint, já validados no construtor */
  isPrivateConfigured(): boolean {
    return this.client !== null
  }
}
