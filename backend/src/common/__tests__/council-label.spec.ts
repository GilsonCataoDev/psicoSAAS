import { COUNCIL_LABELS, COUNCIL_REGISTRATION_FORMAT, CRP_FORMAT, PROFESSIONS, councilLabel, requiresCrp } from '../professions'

describe('councilLabel', () => {
  it('cobre todas as profissoes cadastradas', () => {
    for (const profession of PROFESSIONS) {
      expect(COUNCIL_LABELS).toHaveProperty(profession)
    }
  })

  it('rotula o registro de cada conselho', () => {
    expect(councilLabel('psicologia')).toBe('CRP')
    expect(councilLabel('nutricao')).toBe('CRN')
    expect(councilLabel('fisioterapia')).toBe('CREFITO')
    expect(councilLabel('terapia_ocupacional')).toBe('CREFITO')
    expect(councilLabel('fonoaudiologia')).toBe('CRFa')
    expect(councilLabel('odontologia')).toBe('CRO')
    expect(councilLabel('personal_trainer')).toBe('CREF')
  })

  it('nao inventa sigla para profissao sem conselho conhecido', () => {
    expect(councilLabel('outro')).toBe('Registro profissional')
  })

  it('conta sem profissao cai no padrao historico (psicologia)', () => {
    expect(councilLabel(null)).toBe('CRP')
    expect(councilLabel(undefined)).toBe('CRP')
  })

  it('valor desconhecido nao quebra a tela publica', () => {
    expect(councilLabel('profissao_que_nao_existe')).toBe('Registro profissional')
  })
})

describe('formato do registro por profissao', () => {
  it('CRP so aceita regiao 01-24', () => {
    expect(CRP_FORMAT.test('06/123456')).toBe(true)
    expect(CRP_FORMAT.test('25/123456')).toBe(false)
    expect(CRP_FORMAT.test('CRN-3 12345')).toBe(false)
  })

  it('aceita os formatos reais dos demais conselhos', () => {
    expect(COUNCIL_REGISTRATION_FORMAT.test('CRN-3 12345')).toBe(true)
    expect(COUNCIL_REGISTRATION_FORMAT.test('CREFITO-3/12345-F')).toBe(true)
    expect(COUNCIL_REGISTRATION_FORMAT.test('CRO/SP 98765')).toBe(true)
    expect(COUNCIL_REGISTRATION_FORMAT.test('')).toBe(true)
  })

  it('barra injecao e registro longo demais', () => {
    expect(COUNCIL_REGISTRATION_FORMAT.test('<script>alert(1)</script>')).toBe(false)
    expect(COUNCIL_REGISTRATION_FORMAT.test('a'.repeat(31))).toBe(false)
  })

  it('so psicologia tem formato fixo — os demais conselhos variam', () => {
    expect(requiresCrp('psicologia')).toBe(true)
    for (const profession of PROFESSIONS.filter(p => p !== 'psicologia')) {
      expect(requiresCrp(profession)).toBe(false)
    }
  })
})

/**
 * frontend/src/lib/professions.ts e um espelho manual deste arquivo. Divergencia
 * entre os dois foi justamente o que fez telas publicas rotularem o registro de
 * outras profissoes como "CRP" — este teste trava o espelho.
 */
describe('espelho backend/frontend', () => {
  const mirrorPath = require('path').resolve(__dirname, '../../../../frontend/src/lib/professions.ts')
  const exists = require('fs').existsSync(mirrorPath)
  const source: string = exists ? require('fs').readFileSync(mirrorPath, 'utf-8') : ''

  const testIfMirror = exists ? it : it.skip

  testIfMirror('lista as mesmas profissoes', () => {
    for (const profession of PROFESSIONS) {
      expect(source).toContain(`'${profession}'`)
    }
  })

  testIfMirror('usa as mesmas siglas de conselho', () => {
    for (const [profession, label] of Object.entries(COUNCIL_LABELS)) {
      expect(source).toContain(label ? `${profession}: '${label}'` : `${profession}: null`)
    }
  })
})
