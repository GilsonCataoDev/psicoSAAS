import PDFDocument = require('pdfkit')

const DOMAIN_LABELS: Record<string, string> = {
  intelligence: 'Inteligência',
  attention: 'Atenção',
  memory: 'Memória',
  executive_functions: 'Funções executivas',
  language: 'Linguagem',
  visuospatial_skills: 'Habilidades visuoespaciais',
  behavioral_scales: 'Escalas comportamentais',
  personality: 'Personalidade',
}

const PROCEDURE_TYPE_LABELS: Record<string, string> = {
  psychological_test: 'Teste psicológico',
  neuropsychological_procedure: 'Procedimento neuropsicológico',
  behavioral_scale: 'Escala comportamental',
  clinical_interview: 'Entrevista clínica',
  observation: 'Observação',
  other: 'Outro',
}

const ITEM_STATUS_LABELS: Record<string, string> = {
  planned: 'Planejado',
  applied: 'Aplicado',
  integrated: 'Integrado',
  not_applied: 'Não aplicado',
}

const ASSESSMENT_STATUS_LABELS: Record<string, string> = {
  planning: 'Planejamento',
  in_progress: 'Em andamento',
  integration: 'Integração',
  completed: 'Concluída',
  archived: 'Arquivada',
}

export type NeuropsychAssessmentPdfInput = {
  patient: { name: string }
  status: string
  evaluatedDomains: string[]
  startedAt: string
  completedAt?: string | Date | null
  referralQuestion?: string
  clinicalHistory?: string
  clinicalHypotheses?: string
  qualitativeObservations?: string
  integrationDraft?: string
  professionalConclusion?: string
  batteryItems: Array<{
    name: string
    procedureType: string
    status: string
    domains: string[]
    purpose?: string
    resultSummary?: string
    qualitativeNotes?: string
    score?: number | null
    scoreType?: string
    appliedDate?: string
  }>
}

export function buildNeuropsychAssessmentPdf(
  data: NeuropsychAssessmentPdfInput,
  psychologistName: string,
  psychologistCrp: string,
): PDFKit.PDFDocument {
  const pdf = new PDFDocument({ size: 'A4', margin: 42, bufferPages: true, info: {
    Title: `Laudo de Avaliação Neuropsicológica — ${data.patient.name}`,
    Author: psychologistName,
    Subject: 'Laudo de Avaliação Neuropsicológica',
    Keywords: 'UseCognia, avaliação neuropsicológica, laudo',
  } })
  const W = pdf.page.width
  const H = pdf.page.height
  const L = 44, R = W - 44
  const CW = R - L

  const sage = '#2F6F52'
  const sageDark = '#21372D'
  const ink = '#252725'
  const muted = '#6A6F69'
  const line = '#D9E3DC'
  const paper = '#FBFCFA'

  const drawPageBase = () => {
    pdf.rect(0, 0, W, H).fill(paper)
    pdf.rect(0, 0, W, 8).fill(sageDark)
  }

  const drawFooter = (page: number, total: number) => {
    const fy = H - 38
    pdf.strokeColor(line).lineWidth(0.8).moveTo(L, fy).lineTo(R, fy).stroke()
    pdf.fillColor(muted).font('Helvetica').fontSize(7)
      .text(`UseCognia  |  Laudo de Avaliação Neuropsicológica — ${data.patient.name}`, L, fy + 8, { width: CW - 80, lineBreak: false })
    pdf.text(`Página ${page} de ${total}`, R - 60, fy + 8, { width: 60, align: 'right', lineBreak: false })
  }

  const sectionTitle = (title: string) => {
    const ty = pdf.y
    pdf.rect(L, ty, CW, 20).fill('#EEF8F3')
    pdf.fillColor(sageDark).font('Helvetica-Bold').fontSize(8)
      .text(title.toUpperCase(), L + 10, ty + 6, { width: CW - 20, lineBreak: false })
    pdf.y = ty + 28
  }

  const field = (label: string, value: string | undefined | null) => {
    if (!value?.trim()) return
    pdf.fillColor(muted).font('Helvetica-Bold').fontSize(6.8).text(label, { width: CW, lineBreak: false })
    pdf.fillColor(ink).font('Helvetica').fontSize(8.5).text(value, { width: CW, lineGap: 1.5 })
    pdf.moveDown(0.5)
  }

  const checkPageBreak = (needed = 60) => {
    if (pdf.y > H - 80 - needed) {
      pdf.addPage()
      drawPageBase()
      pdf.y = 24
    }
  }

  // ── Capa ──────────────────────────────────────────────────────────────────
  drawPageBase()

  pdf.rect(0, 8, W, 100).fill('#F4F8F5')
  pdf.fillColor(sageDark).font('Helvetica-Bold').fontSize(10).text('UseCognia', L, 24, { lineBreak: false })
  pdf.fillColor(muted).font('Helvetica').fontSize(7).text('Plataforma para psicólogos e terapeutas', L, 38, { lineBreak: false })

  pdf.fillColor(ink).font('Helvetica-Bold').fontSize(18).text('Laudo de Avaliação Neuropsicológica', L, 56, { width: CW })
  pdf.fillColor(sage).font('Helvetica-Bold').fontSize(12).text(data.patient.name, L, 78, { width: CW })

  pdf.strokeColor(line).lineWidth(1).moveTo(L, 110).lineTo(R, 110).stroke()
  pdf.y = 120

  pdf.roundedRect(L, 120, CW, 44, 6).fillAndStroke('#FFFFFF', '#DCE8DF')
  pdf.fillColor(muted).font('Helvetica-Bold').fontSize(6.5).text('PROFISSIONAL', L + 14, 133, { width: 150, lineBreak: false })
  pdf.fillColor(ink).font('Helvetica-Bold').fontSize(8.5).text(psychologistName, L + 14, 144, { width: 200, lineBreak: false })
  pdf.fillColor(muted).font('Helvetica').fontSize(7).text(`CRP ${psychologistCrp}`, L + 14, 156, { width: 150, lineBreak: false })

  pdf.strokeColor('#EDF1EE').lineWidth(0.8).moveTo(L + 240, 131).lineTo(L + 240, 159).stroke()
  pdf.fillColor(muted).font('Helvetica-Bold').fontSize(6.5).text('STATUS', L + 255, 133, { width: 120, lineBreak: false })
  pdf.fillColor(ink).font('Helvetica-Bold').fontSize(8.5).text(ASSESSMENT_STATUS_LABELS[data.status] ?? data.status, L + 255, 144, { width: 120, lineBreak: false })

  pdf.strokeColor('#EDF1EE').lineWidth(0.8).moveTo(R - 100, 131).lineTo(R - 100, 159).stroke()
  pdf.fillColor(muted).font('Helvetica-Bold').fontSize(6.5).text('GERADO EM', R - 86, 133, { width: 72, align: 'right', lineBreak: false })
  pdf.fillColor(ink).font('Helvetica-Bold').fontSize(8.5).text(new Date().toLocaleDateString('pt-BR'), R - 86, 144, { width: 72, align: 'right', lineBreak: false })

  pdf.y = 178

  sectionTitle('Dados Gerais')
  pdf.fillColor(muted).font('Helvetica-Bold').fontSize(6.8).text('INÍCIO DO ACOMPANHAMENTO', { width: CW / 2 - 8, lineBreak: false })
  pdf.fillColor(ink).font('Helvetica').fontSize(8.5).text(new Date(`${data.startedAt}T12:00:00`).toLocaleDateString('pt-BR'), { width: CW / 2 - 8 })
  pdf.moveDown(0.5)
  if (data.completedAt) {
    pdf.fillColor(muted).font('Helvetica-Bold').fontSize(6.8).text('CONCLUÍDA EM', { width: CW / 2 - 8, lineBreak: false })
    pdf.fillColor(ink).font('Helvetica').fontSize(8.5).text(new Date(data.completedAt).toLocaleDateString('pt-BR'), { width: CW / 2 - 8 })
    pdf.moveDown(0.5)
  }
  if (data.evaluatedDomains.length) {
    field('DOMÍNIOS AVALIADOS', data.evaluatedDomains.map(d => DOMAIN_LABELS[d] ?? d).join(', '))
  }

  checkPageBreak(80)
  sectionTitle('Planejamento Clínico')
  field('MOTIVO E PERGUNTA DE ENCAMINHAMENTO', data.referralQuestion)
  field('HISTÓRIA CLÍNICA', data.clinicalHistory)
  field('HIPÓTESES CLÍNICAS PROVISÓRIAS', data.clinicalHypotheses)

  if (data.batteryItems.length > 0) {
    checkPageBreak(60)
    sectionTitle('Bateria de Avaliação')
    for (const item of data.batteryItems) {
      checkPageBreak(60)
      const headerY = pdf.y
      pdf.roundedRect(L, headerY, CW, 18, 4).fill('#F0F6F3')
      pdf.fillColor(sageDark).font('Helvetica-Bold').fontSize(8)
        .text(item.name, L + 10, headerY + 5, { width: CW / 2, lineBreak: false })
      pdf.fillColor(muted).font('Helvetica').fontSize(7)
        .text(`${PROCEDURE_TYPE_LABELS[item.procedureType] ?? item.procedureType} · ${ITEM_STATUS_LABELS[item.status] ?? item.status}`, L + CW / 2, headerY + 5, { width: CW / 2 - 10, align: 'right', lineBreak: false })
      pdf.y = headerY + 24

      if (item.domains.length) {
        pdf.fillColor(sage).font('Helvetica').fontSize(6.5)
          .text(item.domains.map(d => DOMAIN_LABELS[d] ?? d).join(' · '), L + 6, pdf.y, { width: CW - 12, lineBreak: false })
        pdf.moveDown(0.5)
      }
      field('FINALIDADE', item.purpose)
      if (item.score !== null && item.score !== undefined) {
        field('ESCORE', `${item.score}${item.scoreType ? ` (${item.scoreType})` : ''}`)
      }
      field('RESULTADO ESCRITO', item.resultSummary)
      field('OBSERVAÇÕES QUALITATIVAS', item.qualitativeNotes)

      pdf.strokeColor(line).lineWidth(0.5).moveTo(L, pdf.y + 2).lineTo(R, pdf.y + 2).stroke()
      pdf.moveDown(0.8)
    }
  }

  checkPageBreak(80)
  sectionTitle('Integração e Conclusão')
  field('OBSERVAÇÕES QUALITATIVAS GERAIS', data.qualitativeObservations)
  field('INTEGRAÇÃO DOS RESULTADOS', data.integrationDraft)
  field('CONCLUSÃO PROFISSIONAL', data.professionalConclusion)

  checkPageBreak(50)
  pdf.moveDown(1)
  pdf.roundedRect(L, pdf.y, CW, 38, 6).fillAndStroke('#EEF8F3', '#CFE5D9')
  pdf.fillColor(sageDark).font('Helvetica-Bold').fontSize(7.5)
    .text('DOCUMENTO CONFIDENCIAL', L + 14, pdf.y + 8, { width: CW - 28, lineBreak: false })
  pdf.fillColor(muted).font('Helvetica').fontSize(7)
    .text('Este laudo contém informações sigilosas protegidas pelo sigilo profissional (CFP). Uso restrito ao profissional responsável e a quem ele autorizar o compartilhamento.', L + 14, pdf.y + 10, { width: CW - 28, lineGap: 1.2 })

  const range = pdf.bufferedPageRange()
  for (let i = range.start; i < range.start + range.count; i++) {
    pdf.switchToPage(i)
    drawFooter(i + 1, range.count)
  }

  return pdf
}
