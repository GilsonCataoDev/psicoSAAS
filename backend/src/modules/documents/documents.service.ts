import { Injectable, NotFoundException, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { createHmac, randomBytes } from 'crypto'
import { ConfigService } from '@nestjs/config'
import { Document, DocType } from './entities/document.entity'
import { User } from '../auth/entities/user.entity'

export interface CreateDocumentDto {
  patientId: string
  patientName: string
  type: DocType
  title: string
  content: string
}

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name)
  private readonly signSecret: string

  constructor(
    @InjectRepository(Document) private repo: Repository<Document>,
    private cfg: ConfigService,
  ) {
    // SIGN_SECRET deve ter >= 32 chars — validado no bootstrap
    this.signSecret = cfg.getOrThrow('SIGN_SECRET')
  }

  // ─── Gerar assinatura digital ─────────────────────────────────────────────

  /**
   * Gera o HMAC-SHA256 do conteúdo do documento.
   * Inclui userId + timestamp para unicidade mesmo com conteúdo igual.
   */
  private generateSignature(content: string, userId: string, timestamp: number): {
    signCode: string
    signHash: string
  } {
    const data = `${content}:${userId}:${timestamp}`
    const fullHash = createHmac('sha256', this.signSecret).update(data).digest('hex')
    const year = new Date().getFullYear()
    // Código curto (8 chars hex) — legível e único na prática
    const shortCode = fullHash.slice(0, 8).toUpperCase()
    const signCode = `PS-${year}-${shortCode}`
    return { signCode, signHash: fullHash }
  }

  // ─── Criar e assinar documento ────────────────────────────────────────────

  async create(user: User, dto: CreateDocumentDto, signerIp?: string): Promise<Document> {
    const timestamp = Date.now()
    const { signCode, signHash } = this.generateSignature(dto.content, user.id, timestamp)

    // Garante unicidade (colisão improvável mas tratada)
    const exists = await this.repo.findOne({ where: { signCode } })
    const finalCode = exists
      ? `PS-${new Date().getFullYear()}-${randomBytes(4).toString('hex').toUpperCase()}`
      : signCode

    const doc = this.repo.create({
      ...dto,
      userId: user.id,
      signCode: finalCode,
      signHash,
      signedAt: new Date(timestamp),
      signerIp,
      psychologistName: user.name,
      psychologistCrp: user.crp,
    })

    const saved = await this.repo.save(doc)
    this.logger.log(`[Documento] Assinado: ${saved.signCode} por ${user.name} (CRP ${user.crp})`)
    return saved
  }

  // ─── Listar documentos do psicólogo ──────────────────────────────────────

  async findByUser(userId: string, type?: DocType): Promise<Document[]> {
    const where: any = { userId }
    if (type) where.type = type
    return this.repo.find({ where, order: { createdAt: 'DESC' } })
  }

  // ─── Verificação pública por código ──────────────────────────────────────

  /**
   * Endpoint público: qualquer pessoa pode verificar se um código é autêntico.
   * Retorna dados não-sensíveis do documento (sem conteúdo clínico).
   */
  async verifyByCode(signCode: string): Promise<{
    valid: boolean
    document?: {
      signCode: string
      type: DocType
      title: string
      patientName: string
      psychologistName: string
      psychologistCrp: string
      signedAt: Date
      createdAt: Date
    }
  }> {
    const doc = await this.repo.findOne({ where: { signCode } })

    if (!doc) {
      return { valid: false }
    }

    // Re-verifica o hash para garantir que o conteúdo não foi adulterado
    const timestamp = doc.signedAt.getTime()
    const data = `${doc.content}:${doc.userId}:${timestamp}`
    const recomputedHash = createHmac('sha256', this.signSecret).update(data).digest('hex')
    const valid = recomputedHash === doc.signHash

    if (!valid) {
      this.logger.warn(`[Verificação] Hash inválido para código ${signCode} — possível adulteração`)
      return { valid: false }
    }

    return {
      valid: true,
      document: {
        signCode: doc.signCode,
        type: doc.type,
        title: doc.title,
        patientName: doc.patientName,
        psychologistName: doc.psychologistName,
        psychologistCrp: doc.psychologistCrp,
        signedAt: doc.signedAt,
        createdAt: doc.createdAt,
      },
    }
  }
}
