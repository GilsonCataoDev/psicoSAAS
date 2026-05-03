import { Injectable, NotFoundException, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { createHmac, randomBytes } from 'crypto'
import { ConfigService } from '@nestjs/config'
import PDFDocument = require('pdfkit')
import * as QRCode from 'qrcode'
import { encrypt, safeDecrypt } from '../../common/crypto/encrypt.util'
import { Document, DocType } from './entities/document.entity'
import { User } from '../auth/entities/user.entity'

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
      margin: 54,
      bufferPages: true,
      info: {
        Title: stored.title,
        Author: stored.psychologistName,
        Subject: DOC_TYPE_LABELS[stored.type] ?? stored.type,
        Keywords: `PsicoSaaS, ${stored.signCode}, autenticidade`,
      },
    })
    const done = this.collectPdf(pdf)

    const pageWidth = pdf.page.width
    const pageHeight = pdf.page.height
    const left = 54
    const right = pageWidth - 54
    const contentWidth = right - left
    const sage = '#2F7657'
    const ink = '#2B2B29'
    const muted = '#6F6F68'
    const line = '#D9DED8'

    const drawHeader = () => {
      pdf.rect(0, 0, pageWidth, 90).fill('#F4F8F5')
      pdf.fillColor(sage).font('Helvetica-Bold').fontSize(10).text('PsicoSaaS', left, 30)
      pdf.fillColor(ink).font('Helvetica-Bold').fontSize(18)
        .text(DOC_TYPE_LABELS[stored.type].toUpperCase(), left, 48, { width: contentWidth - 120 })
      pdf.fillColor(muted).font('Helvetica').fontSize(9)
        .text('Documento psicologico emitido com verificacao de autenticidade', left, 72)
      pdf.strokeColor('#DCE8DF').lineWidth(1).moveTo(left, 90).lineTo(right, 90).stroke()
      pdf.y = 126
    }

    const drawFooter = (pageNumber: number, totalPages: number) => {
      const footerY = pageHeight - 58
      pdf.strokeColor(line).lineWidth(1).moveTo(left, footerY).lineTo(right, footerY).stroke()
      pdf.fillColor(muted).font('Helvetica').fontSize(8)
        .text(`Codigo: ${stored.signCode}`, left, footerY + 12, { width: 220 })
      pdf.text(`Pagina ${pageNumber} de ${totalPages}`, right - 90, footerY + 12, { width: 90, align: 'right' })
    }

    pdf.on('pageAdded', drawHeader)
    drawHeader()

    const contentTop = 122
    const signatureY = 515
    const maxContentHeight = signatureY - contentTop - 22
    let bodyFontSize = 10.5
    let lineGap = 3

    while (bodyFontSize > 7.2) {
      pdf.font('Helvetica').fontSize(bodyFontSize)
      const height = pdf.heightOfString(content, {
        width: contentWidth,
        align: 'justify',
        lineGap,
      })
      if (height <= maxContentHeight) break
      bodyFontSize -= 0.4
      lineGap = Math.max(1.2, lineGap - 0.25)
    }

    pdf.fillColor(ink).font('Helvetica').fontSize(bodyFontSize)
    pdf.text(content, left, contentTop, {
      width: contentWidth,
      height: maxContentHeight,
      align: 'justify',
      lineGap,
      ellipsis: true,
    })

    pdf.strokeColor('#8D928C').lineWidth(1.1).moveTo(left, signatureY).lineTo(left + 210, signatureY).stroke()
    pdf.fillColor(ink).font('Helvetica-Bold').fontSize(9.5).text(stored.psychologistName, left, signatureY + 11)
    pdf.fillColor(muted).font('Helvetica').fontSize(8.4).text(`Psicologo(a) - CRP ${stored.psychologistCrp}`, left, signatureY + 26)
    pdf.text(`Assinado em ${stored.signedAt.toLocaleDateString('pt-BR')}`, left, signatureY + 40)

    const qrX = right - 84
    pdf.roundedRect(qrX - 8, signatureY - 10, 92, 106, 7).strokeColor('#D6DDD8').stroke()
    pdf.image(qrBuffer, qrX, signatureY - 2, { width: 76, height: 76 })
    pdf.fillColor(muted).font('Helvetica').fontSize(6.8)
      .text('Verificar autenticidade', qrX - 6, signatureY + 78, { width: 88, align: 'center' })

    const boxY = 632
    pdf.roundedRect(left, boxY, contentWidth, 62, 9).fillAndStroke('#EEF8F3', '#CFE5D9')
    pdf.fillColor(sage).font('Helvetica-Bold').fontSize(9)
      .text('Documento com autenticidade verificavel', left + 14, boxY + 12)
    pdf.fillColor(sage).font('Helvetica').fontSize(8)
      .text(`Codigo: ${stored.signCode}`, left + 14, boxY + 28)
      .text(`Hash: ${stored.signHash.slice(0, 16).toUpperCase()} | HMAC-SHA256`, left + 14, boxY + 42)
    pdf.fillColor(muted).font('Helvetica').fontSize(7)
      .text(verificationUrl, left + 260, boxY + 23, { width: contentWidth - 274, align: 'right' })

    pdf.fillColor('#777B76').font('Helvetica').fontSize(6.8)
      .text(
        'A verificacao confirma que o documento registrado na plataforma nao foi alterado desde a emissao. Para assinatura digital com validade juridica plena, utilize certificado ICP-Brasil ou assinatura gov.br quando aplicavel.',
        left,
        710,
        { width: contentWidth, align: 'center', lineGap: 1 },
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
