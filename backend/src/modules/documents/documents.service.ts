import { ForbiddenException, Injectable, NotFoundException, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { createHmac, randomBytes } from 'crypto'
import { ConfigService } from '@nestjs/config'
import PDFDocument = require('pdfkit')
import * as QRCode from 'qrcode'
import { encrypt, safeDecrypt } from '../../common/crypto/encrypt.util'
import { Document, DocType } from './entities/document.entity'
import { User } from '../auth/entities/user.entity'
import { Subscription } from '../billing/entities/subscription.entity'
import { PLAN_LIMITS } from '../../common/guards/plan.guard'

export interface CreateDocumentDto {
  patientId: string
  patientName: string
  type: DocType
  title: string
  content: string
}

const DOC_TYPE_LABELS: Record<DocType, string> = {
  declaracao: 'Declaracao de Comparecimento',
  recibo: 'Recibo de Pagamento',
  relatorio: 'Relatorio Psicologico',
  atestado: 'Atestado Psicologico',
  encaminhamento: 'Carta de Encaminhamento',
}

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name)
  private readonly signSecret: string
  private readonly encryptedPrefix = 'psicosaas.document.v1:'

  constructor(
    @InjectRepository(Document) private repo: Repository<Document>,
    @InjectRepository(Subscription) private subs: Repository<Subscription>,
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

  private encryptContent(content: string): string {
    return `${this.encryptedPrefix}${encrypt(content)}`
  }

  private decryptContent(content: string): string {
    if (!content.startsWith(this.encryptedPrefix)) return safeDecrypt(content) ?? ''
    return safeDecrypt(content.slice(this.encryptedPrefix.length)) ?? ''
  }

  private getVerificationUrl(signCode: string): string {
    const frontendUrl = (this.cfg.get('FRONTEND_URL') ?? '').replace(/\/$/, '')
    return `${frontendUrl}/#/verificar/${encodeURIComponent(signCode)}`
  }

  private exposeDocument(doc: Document): Document {
    const { signHash: _signHash, signerIp: _signerIp, ...safeDoc } = doc as any
    return { ...safeDoc, content: this.decryptContent(doc.content) } as Document
  }

  private collectPdf(pdf: PDFKit.PDFDocument): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = []
      pdf.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
      pdf.on('end', () => resolve(Buffer.concat(chunks)))
      pdf.on('error', reject)
    })
  }

  private fitTextToHeight(pdf: PDFKit.PDFDocument, text: string, width: number, height: number, fontSize: number, lineGap: number): string {
    const measure = (value: string) => pdf.heightOfString(value, {
      width,
      align: 'justify',
      lineGap,
    })

    if (measure(text) <= height) return text

    const suffix = '\n\n[Conteudo resumido para manter este PDF em uma pagina.]'
    let low = 0
    let high = text.length
    let best = ''

    while (low <= high) {
      const mid = Math.floor((low + high) / 2)
      const candidate = `${text.slice(0, mid).trimEnd()}...${suffix}`
      if (measure(candidate) <= height) {
        best = candidate
        low = mid + 1
      } else {
        high = mid - 1
      }
    }

    return best || text.slice(0, 600).trimEnd()
  }

  // ─── Criar e assinar documento ────────────────────────────────────────────

  async create(user: User, dto: CreateDocumentDto, signerIp?: string): Promise<Document> {
    await this.checkDocumentLimit(user.id)

    const timestamp = Date.now()
    const { signCode, signHash } = this.generateSignature(dto.content, user.id, timestamp)

    // Garante unicidade (colisão improvável mas tratada)
    const exists = await this.repo.findOne({ where: { signCode } })
    const finalCode = exists
      ? `PS-${new Date().getFullYear()}-${randomBytes(4).toString('hex').toUpperCase()}`
      : signCode

    const doc = this.repo.create({
      ...dto,
      content: this.encryptContent(dto.content),
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
    return this.exposeDocument(saved)
  }

  private async checkDocumentLimit(userId: string): Promise<void> {
    const sub = await this.subs.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    })
    const plan = (sub?.status === 'active' || sub?.status === 'trialing')
      ? (sub.plan as keyof typeof PLAN_LIMITS)
      : 'free'

    const limit = PLAN_LIMITS[plan]?.maxDocuments ?? 0
    if (limit === -1) return

    const count = await this.repo.count({ where: { userId } })
    if (count >= limit) {
      throw new ForbiddenException({
        message: `Limite de ${limit} documento${limit !== 1 ? 's' : ''} atingido para o plano ${plan}. Faça upgrade para gerar mais.`,
        upgradeUrl: '/planos',
        currentPlan: plan,
      })
    }
  }

  // ─── Listar documentos do psicólogo ──────────────────────────────────────

  async findByUser(userId: string, type?: DocType): Promise<Document[]> {
    const where: any = { userId }
    if (type) where.type = type
    const docs = await this.repo.find({ where, order: { createdAt: 'DESC' } })
    return docs.map((doc) => this.exposeDocument(doc))
  }

  async generatePdf(id: string, userId: string): Promise<{ filename: string; buffer: Buffer }> {
    const stored = await this.repo.findOne({ where: { id } })
    if (!stored) throw new NotFoundException()
    if (stored.userId !== userId) throw new NotFoundException()

    const content = this.decryptContent(stored.content)
    const verificationUrl = this.getVerificationUrl(stored.signCode)
    const qrBuffer = await QRCode.toBuffer(verificationUrl, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 220,
      color: { dark: '#1C1C1A', light: '#FFFFFF' },
    })

    const pdf = new PDFDocument({
      size: 'A4',
      margin: 42,
      bufferPages: true,
      info: {
        Title: stored.title,
        Author: stored.psychologistName,
        Subject: DOC_TYPE_LABELS[stored.type] ?? stored.type,
        Keywords: `UseCognia, ${stored.signCode}, autenticidade`,
      },
    })
    const done = this.collectPdf(pdf)

    const pageWidth = pdf.page.width
    const pageHeight = pdf.page.height
    const left = 44
    const right = pageWidth - 44
    const contentWidth = right - left
    const sage = '#2F7657'
    const sageDark = '#245C45'
    const sageSoft = '#EEF8F3'
    const ink = '#252725'
    const muted = '#6A6F69'
    const line = '#D9E3DC'
    const paper = '#FBFCFA'
    const issuedAt = stored.signedAt.toLocaleDateString('pt-BR')

    const drawHeader = () => {
      pdf.rect(0, 0, pageWidth, pageHeight).fill(paper)
      pdf.rect(0, 0, pageWidth, 14).fill(sageDark)
      pdf.rect(0, 14, pageWidth, 74).fill('#F3F8F5')
      pdf.fillColor(sageDark).font('Helvetica-Bold').fontSize(10)
        .text('UseCognia', left, 30, { width: 120, lineBreak: false })
      pdf.fillColor(muted).font('Helvetica').fontSize(6.8)
        .text('Documento psicologico com verificacao digital', left, 45, { width: 230, lineBreak: false })

      pdf.fillColor(ink).font('Helvetica-Bold').fontSize(16)
        .text(DOC_TYPE_LABELS[stored.type].toUpperCase(), left, 62, { width: contentWidth - 160, lineBreak: false })

      pdf.roundedRect(right - 138, 28, 138, 42, 8).fillAndStroke('#FFFFFF', '#DCE8DF')
      pdf.fillColor(muted).font('Helvetica-Bold').fontSize(6.2)
        .text('CODIGO DE VERIFICACAO', right - 126, 39, { width: 114, align: 'right', lineBreak: false })
      pdf.fillColor(sageDark).font('Helvetica-Bold').fontSize(9)
        .text(stored.signCode, right - 126, 51, { width: 114, align: 'right', lineBreak: false })

      pdf.strokeColor(line).lineWidth(1).moveTo(left, 88).lineTo(right, 88).stroke()
      pdf.y = 104
    }

    const drawFooter = (pageNumber: number, totalPages: number) => {
      const footerY = pageHeight - 34
      pdf.strokeColor(line).lineWidth(1).moveTo(left, footerY).lineTo(right, footerY).stroke()
      pdf.fillColor(muted).font('Helvetica').fontSize(7)
        .text(`UseCognia | Autenticidade verificavel em ${verificationUrl}`, left, footerY + 10, { width: contentWidth - 110, lineBreak: false })
      pdf.text(`Pagina ${pageNumber} de ${totalPages}`, right - 86, footerY + 10, { width: 86, align: 'right', lineBreak: false })
    }

    pdf.on('pageAdded', drawHeader)
    drawHeader()

    const metaTop = 106
    pdf.roundedRect(left, metaTop, contentWidth, 54, 8).fillAndStroke('#FFFFFF', '#E2E9E4')
    pdf.fillColor(muted).font('Helvetica-Bold').fontSize(6.4)
      .text('PROFISSIONAL', left + 14, metaTop + 12, { width: 110, lineBreak: false })
    pdf.fillColor(ink).font('Helvetica-Bold').fontSize(8.4)
      .text(stored.psychologistName, left + 14, metaTop + 24, { width: 185, lineBreak: false })
    pdf.fillColor(muted).font('Helvetica').fontSize(7)
      .text(`CRP ${stored.psychologistCrp}`, left + 14, metaTop + 37, { width: 185, lineBreak: false })

    pdf.strokeColor('#EDF1EE').lineWidth(1).moveTo(left + 210, metaTop + 10).lineTo(left + 210, metaTop + 44).stroke()
    pdf.fillColor(muted).font('Helvetica-Bold').fontSize(6.4)
      .text('PESSOA ATENDIDA', left + 226, metaTop + 12, { width: 110, lineBreak: false })
    pdf.fillColor(ink).font('Helvetica-Bold').fontSize(8.4)
      .text(stored.patientName, left + 226, metaTop + 25, { width: 170, lineBreak: false })

    pdf.strokeColor('#EDF1EE').lineWidth(1).moveTo(right - 118, metaTop + 10).lineTo(right - 118, metaTop + 44).stroke()
    pdf.fillColor(muted).font('Helvetica-Bold').fontSize(6.4)
      .text('EMISSAO', right - 104, metaTop + 12, { width: 90, align: 'right', lineBreak: false })
    pdf.fillColor(ink).font('Helvetica-Bold').fontSize(8.4)
      .text(issuedAt, right - 104, metaTop + 25, { width: 90, align: 'right', lineBreak: false })

    const contentTop = 184
    const signatureY = 604
    const textWidth = contentWidth - 32
    const maxContentHeight = signatureY - contentTop - 22
    let bodyFontSize = 9.6
    let lineGap = 2

    while (bodyFontSize > 5.8) {
      pdf.font('Helvetica').fontSize(bodyFontSize)
      const height = pdf.heightOfString(content, {
        width: textWidth,
        align: 'justify',
        lineGap,
      })
      if (height <= maxContentHeight) break
      bodyFontSize -= 0.3
      lineGap = Math.max(0.6, lineGap - 0.18)
    }

    const fittedContent = this.fitTextToHeight(pdf, content, textWidth, maxContentHeight, bodyFontSize, lineGap)

    pdf.roundedRect(left, contentTop - 14, contentWidth, maxContentHeight + 28, 8).fillAndStroke('#FFFFFF', '#E4EAE6')
    pdf.fillColor(ink).font('Helvetica').fontSize(bodyFontSize)
    pdf.text(fittedContent, left + 16, contentTop, {
      width: textWidth,
      height: maxContentHeight,
      align: 'justify',
      lineGap,
      ellipsis: false,
      paragraphGap: 0,
    })

    pdf.roundedRect(left, signatureY - 10, contentWidth, 76, 8).fillAndStroke('#FFFFFF', '#E2E9E4')
    pdf.strokeColor('#8D928C').lineWidth(1).moveTo(left + 18, signatureY + 24).lineTo(left + 210, signatureY + 24).stroke()
    pdf.fillColor(ink).font('Helvetica-Bold').fontSize(8.6)
      .text(stored.psychologistName, left + 18, signatureY + 32, { width: 240, lineBreak: false })
    pdf.fillColor(muted).font('Helvetica').fontSize(7.2)
      .text(`Psicologo(a) - CRP ${stored.psychologistCrp}`, left + 18, signatureY + 45, { width: 240, lineBreak: false })
      .text(`Assinado digitalmente em ${issuedAt}`, left + 18, signatureY + 57, { width: 240, lineBreak: false })

    const qrX = right - 80
    pdf.roundedRect(qrX - 9, signatureY - 1, 86, 86, 7).fillAndStroke('#FFFFFF', '#D6DDD8')
    pdf.image(qrBuffer, qrX, signatureY + 7, { width: 68, height: 68 })
    pdf.fillColor(muted).font('Helvetica').fontSize(6)
      .text('Verificar', qrX - 5, signatureY + 73, { width: 78, align: 'center', lineBreak: false })

    const boxY = 698
    pdf.roundedRect(left, boxY, contentWidth, 46, 8).fillAndStroke(sageSoft, '#CFE5D9')
    pdf.fillColor(sageDark).font('Helvetica-Bold').fontSize(8.2)
      .text('Documento com autenticidade verificavel', left + 14, boxY + 10, { width: 220, lineBreak: false })
    pdf.fillColor(sage).font('Helvetica').fontSize(7)
      .text(`Codigo: ${stored.signCode}`, left + 14, boxY + 25, { width: 170, lineBreak: false })
      .text(`Hash: ${stored.signHash.slice(0, 16).toUpperCase()} | HMAC-SHA256`, left + 174, boxY + 25, { width: 225, lineBreak: false })
    pdf.fillColor(muted).font('Helvetica').fontSize(5.8)
      .text(verificationUrl, right - 166, boxY + 15, { width: 152, align: 'right', lineBreak: false })

    pdf.fillColor('#777B76').font('Helvetica').fontSize(6.6)
      .text(
        'A verificacao confirma que o documento registrado na plataforma nao foi alterado desde a emissao.',
        left,
        758,
        { width: contentWidth, align: 'center', lineGap: 0, lineBreak: false },
      )

    const range = pdf.bufferedPageRange()
    for (let i = range.start; i < range.start + range.count; i += 1) {
      pdf.switchToPage(i)
      drawFooter(i + 1, range.count)
    }

    pdf.end()
    const buffer = await done
    const filename = `${stored.signCode}-${stored.type}.pdf`.replace(/[^a-zA-Z0-9_.-]/g, '_')
    return { filename, buffer }
  }

  // ─── Excluir documento ───────────────────────────────────────────────────

  async remove(id: string, userId: string): Promise<{ deleted: boolean }> {
    const doc = await this.repo.findOne({ where: { id } })
    if (!doc) throw new NotFoundException()
    if (doc.userId !== userId) throw new NotFoundException() // não revela existência
    await this.repo.remove(doc)
    return { deleted: true }
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
      fingerprint: string
      algorithm: string
      verificationUrl: string
    }
  }> {
    const doc = await this.repo.findOne({ where: { signCode } })

    if (!doc) {
      return { valid: false }
    }

    // Re-verifica o hash para garantir que o conteúdo não foi adulterado
    const timestamp = doc.signedAt.getTime()
    const content = this.decryptContent(doc.content)
    const data = `${content}:${doc.userId}:${timestamp}`
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
        fingerprint: doc.signHash.slice(0, 16).toUpperCase(),
        algorithm: 'HMAC-SHA256',
        verificationUrl: this.getVerificationUrl(doc.signCode),
      },
    }
  }
}
