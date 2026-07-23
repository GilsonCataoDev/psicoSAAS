import { Injectable, Logger } from '@nestjs/common'
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

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
    this.bucket  = bucket ?? ''
    this.cdnUrl  = process.env.STORAGE_CDN_URL ?? ''

    if (endpoint && bucket && accessKey && secretKey) {
      this.client = new S3Client({
        endpoint,
        region: process.env.STORAGE_REGION ?? 'auto',
        credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
        forcePathStyle: true,
      })
    } else {
      this.logger.warn('STORAGE_* env vars not configured — avatar upload disabled')
    }
  }

  isConfigured(): boolean { return this.client !== null }

  async upload(key: string, buffer: Buffer, contentType: string): Promise<string> {
    if (!this.client) throw new Error('Storage not configured')
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket, Key: key, Body: buffer, ContentType: contentType,
    }))
    return `${this.cdnUrl}/${key}`
  }

  async delete(key: string): Promise<void> {
    if (!this.client) return
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }))
  }

  keyFromUrl(url: string): string {
    return url.replace(`${this.cdnUrl}/`, '')
  }
}