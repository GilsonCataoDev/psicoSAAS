import { describe, expect, it } from 'vitest'
import { BATTERIES, INSTRUMENTS, instrumentsFor } from './instrument-catalog'
import { SCALE_CONFIGS } from '@/lib/scale-scoring'

describe('instrument catalog', () => {
  it('mantém identificadores únicos', () => {
    const ids = INSTRUMENTS.map(instrument => instrument.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('mantém os metadados obrigatórios preenchidos', () => {
    for (const instrument of INSTRUMENTS) {
      expect(instrument.title.trim()).not.toBe('')
      expect(instrument.description.trim()).not.toBe('')
      expect(instrument.template.trim()).not.toBe('')
      expect(instrument.ageGroups.length).toBeGreaterThan(0)
    }
  })

  it('todo instrumento pontuável do catálogo tem entrada em SCALE_CONFIGS', () => {
    // Escala sem config é aplicada e não pontua — falha silenciosa em produção.
    // Apenas instrumentos com category === 'escala' são pontuados; 'formulario',
    // 'entrevista' e 'registro' são texto livre e não passam pelo motor de pontuação.
    const escalas = INSTRUMENTS.filter(i => i.category === 'escala')
    for (const instrumento of escalas) {
      expect(
        SCALE_CONFIGS[instrumento.id],
        `Instrumento "${instrumento.id}" tem category "escala" mas não tem entrada em SCALE_CONFIGS`,
      ).toBeDefined()
    }
  })

  it('preserva a anamnese adulta usada pelo fluxo principal', () => {
    expect(INSTRUMENTS).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'anamnese-adulto',
        category: 'formulario',
        ageGroups: expect.arrayContaining(['adulto']),
      }),
    ]))
  })
})

describe('instrumentsFor', () => {
  const FISIO_IDS = ['eva-dor', 'oswestry', 'berg', 'tinetti', 'dash', 'barthel']
  const NUTRI_IDS = ['anamnese-nutricional', 'recordatorio-24h', 'diario-alimentar', 'qfca', 'predimed']

  it('não muda nada para psicologia — todo item sem `professions` continua visível', () => {
    const psi = instrumentsFor('psicologia').map(i => i.id)
    const semDeclaracao = INSTRUMENTS.filter(i => !i.professions).map(i => i.id)
    expect(psi).toEqual(semDeclaracao)
  })

  it('assume psicologia quando a profissão está ausente (conta antiga)', () => {
    expect(instrumentsFor(undefined)).toEqual(instrumentsFor('psicologia'))
    expect(instrumentsFor(null)).toEqual(instrumentsFor('psicologia'))
  })

  it('entrega à fisioterapia apenas os instrumentos dela', () => {
    expect(instrumentsFor('fisioterapia').map(i => i.id).sort()).toEqual([...FISIO_IDS].sort())
  })

  it('não vaza instrumento clínico de uma profissão para a outra', () => {
    const psi = instrumentsFor('psicologia').map(i => i.id)
    for (const id of FISIO_IDS) expect(psi).not.toContain(id)
    const fisio = instrumentsFor('fisioterapia').map(i => i.id)
    for (const id of ['phq9', 'gad7', 'anamnese-adulto']) expect(fisio).not.toContain(id)
  })

  it('devolve lista vazia para profissão sem catálogo próprio', () => {
    expect(instrumentsFor('odontologia')).toEqual([])
    expect(instrumentsFor('terapia_ocupacional')).toEqual([])
  })

  it('entrega à nutrição apenas os instrumentos dela', () => {
    const nutri = instrumentsFor('nutricao').map(i => i.id)
    expect(nutri.sort()).toEqual([...NUTRI_IDS].sort())
  })

  it('não vaza instrumento de nutrição para psicologia ou fisioterapia', () => {
    const psi   = instrumentsFor('psicologia').map(i => i.id)
    const fisio = instrumentsFor('fisioterapia').map(i => i.id)
    for (const id of NUTRI_IDS) {
      expect(psi).not.toContain(id)
      expect(fisio).not.toContain(id)
    }
  })

  it('registra pontuação para toda escala de fisioterapia do catálogo', () => {
    // Escala sem config no SCALE_CONFIGS é aplicada e não pontua — falha silenciosa.
    for (const id of FISIO_IDS) expect(SCALE_CONFIGS[id]).toBeDefined()
  })

  it('registra pontuação para toda escala de nutrição do catálogo', () => {
    const nutriScalas = instrumentsFor('nutricao').filter(i => i.category === 'escala')
    for (const i of nutriScalas) expect(SCALE_CONFIGS[i.id]).toBeDefined()
  })
})

describe('BATTERIES', () => {
  const catalogIds = new Set(INSTRUMENTS.map(i => i.id))

  it('todos os instrumentIds referenciam ids existentes no catálogo', () => {
    for (const battery of BATTERIES) {
      for (const instrumentId of battery.instrumentIds) {
        expect(
          catalogIds.has(instrumentId),
          `Bateria "${battery.id}" referencia id inexistente: "${instrumentId}"`,
        ).toBe(true)
      }
    }
  })

  it('mantém identificadores únicos de bateria', () => {
    const ids = BATTERIES.map(b => b.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('baterias não referenciam instrumentos de profissão diferente da sua', () => {
    // Uma bateria de psicologia não pode ter instrumentos de fisio/nutri, e vice-versa.
    const idsByProfession: Record<string, Set<string>> = {
      psicologia:    new Set(instrumentsFor('psicologia').map(i => i.id)),
      fisioterapia:  new Set(instrumentsFor('fisioterapia').map(i => i.id)),
      nutricao:      new Set(instrumentsFor('nutricao').map(i => i.id)),
    }
    const professions = Object.keys(idsByProfession)
    for (const battery of BATTERIES) {
      const batteryProfs: string[] = (battery as any).professions ?? ['psicologia']
      for (const id of battery.instrumentIds) {
        for (const prof of professions) {
          if (batteryProfs.includes(prof)) continue
          expect(
            idsByProfession[prof].has(id),
            `Bateria "${battery.id}" (${batteryProfs.join(',')}) referencia instrumento de ${prof}: "${id}"`,
          ).toBe(false)
        }
      }
    }
  })
})
