import { readFileSync } from 'fs'
import { join } from 'path'
import { aiConsentText, knownVersions } from './ai-consent-texts'
import { AI_CONSENT_SCOPES } from './dto/ai-consent.dto'
import { AiConsentScope } from './entities/ai-consent-event.entity'

describe('textos de consentimento de IA', () => {
  it('psicologia mantém as versões históricas', () => {
    // Estas versões já estão gravadas em eventos de consentimento existentes:
    // mudá-las invalidaria a trilha de auditoria de quem já aceitou.
    expect(aiConsentText('clinical_ai_processing', 'psicologia').version).toBe('clinical-ai-v1')
    expect(aiConsentText('session_recording_transcription', 'psicologia').version).toBe('recording-transcription-v1')
    expect(aiConsentText('neuropsych_ai', 'psicologia').version).toBe('neuropsych-ai-v1')
  })

  it('conta sem profissão cai em psicologia (comportamento histórico)', () => {
    for (const scope of AI_CONSENT_SCOPES as readonly AiConsentScope[]) {
      expect(aiConsentText(scope, undefined)).toEqual(aiConsentText(scope, 'psicologia'))
      expect(aiConsentText(scope, null)).toEqual(aiConsentText(scope, 'psicologia'))
    }
  })

  it('texto diferente exige versão diferente', () => {
    // Duas profissões com o mesmo texto podem compartilhar versão; com textos
    // distintos, compartilhar versão tornaria a trilha de auditoria ambígua.
    for (const scope of AI_CONSENT_SCOPES as readonly AiConsentScope[]) {
      const psi = aiConsentText(scope, 'psicologia')
      const gen = aiConsentText(scope, 'nutricao')
      if (psi.text !== gen.text) expect(psi.version).not.toBe(gen.version)
      else expect(psi.version).toBe(gen.version)
    }
  })

  it('o vocabulário genérico não fala de paciente nem de sessão', () => {
    const gen = aiConsentText('session_recording_transcription', 'nutricao')
    expect(gen.text).toContain('cliente')
    expect(gen.text).toContain('atendimento')
    expect(gen.text).not.toMatch(/paciente/i)
    expect(gen.text).not.toMatch(/sess[aã]o/i)
  })

  it('knownVersions lista todas as versões já emitidas do escopo', () => {
    const versions = knownVersions('session_recording_transcription')
    expect(versions).toContain('recording-transcription-v1')
    expect(versions).toContain('recording-transcription-generico-v1')
  })
})

describe('fonte única do texto de consentimento', () => {
  /**
   * `accept()` compara o snapshot recebido byte a byte com o texto canônico.
   * Enquanto o frontend teve cópia própria, qualquer divergência impedia o
   * profissional de consentir e derrubava a gravação de sessão. Este teste
   * impede que a cópia volte.
   */
  it('o frontend não tem cópia do texto', () => {
    const repo = join(__dirname, '..', '..', '..', '..')
    const source = readFileSync(join(repo, 'frontend/src/hooks/api/ai-governance.ts'), 'utf8')

    expect(source).not.toContain('AI_CONSENT_TEXT =')
    // Nenhum trecho do texto canônico pode aparecer hardcoded lá.
    const trecho = aiConsentText('session_recording_transcription', 'psicologia').text.slice(0, 40)
    expect(source).not.toContain(trecho)
    // E o status precisa continuar carregando texto e versão.
    expect(source).toContain('text: string')
    expect(source).toContain('version: string')
  })
})
