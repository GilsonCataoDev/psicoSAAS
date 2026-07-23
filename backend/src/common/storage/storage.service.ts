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
 *   STORAGE_CDN_URL         — URL pública base (ex: https://cdn.usecognia.com.br)
 *   STORAGE_REGION          — região (padrão: 'auto' para R2)
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name)
  private readonly client: S3Client
  private readonly bucket: string
  private readonly cdnUrl: string

  constructor() {
    const endpoint = process.env.STORAGE_ENDPOINT
    const bucket = process.env.STORAGE_BUCKET
    const cdnUrl = process.env.STORAGE_CDN_URL
    const accessKeyId = process.env.STORAGE_ACCESS_KEY_ID
    const secretAccessKey = process.env.STORAGE_SECRET_ACCESS_KEY

    if (!endpoint || !bucket || !cdnUrl || !accessKeyId || !secretAccessKey) {
      this.logger.warn('StorageService: variáveis de ambiente incompletas — uploads desabilitados')
    }

    this.bucket = bucket ?? ''
    this.cdnUrl = (cdnUrl ?? '').replace(/\/$/, '')

    this.client = new S3Client({
      region: process.env.STORAGE_REGION ?? 'auto',
      endpoint,
      credentials: { accessKeyId: accessKeyId ?? '', secretAccessKey: secretAccessKey ?? '' },
    })
  }

  async upload(key: string, body: Buffer, contentType: string): Promise<string> {
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
    const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }))
    const stream = result.Body as NodeJS.ReadableStream
    const chunks: Buffer[] = []
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    return Buffer.concat(chunks)
  }

  async delete(key: string): Promise<void> {
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
    return Boolean(process.env.STORAGE_BUCKET && process.env.STORAGE_CDN_URL)
  }

  /** Uploads privados (sem CDN) só precisam de bucket + credenciais + endpoint */
  isPrivateConfigured(): boolean {
    return Boolean(
      process.env.STORAGE_BUCKET &&
      process.env.STORAGE_ENDPOINT &&
      process.env.STORAGE_ACCESS_KEY_ID &&
      process.env.STORAGE_SECRET_ACCESS_KEY,
    )
  }
}
