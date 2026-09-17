import { describe, expect, it } from 'vitest'
import { docTypesFor, professionalRecordTemplate } from './prontuario'

describe('professionalRecordTemplate', () => {
  it('entrega campos próprios para as áreas com ficha inicial', () => {
    expect(professionalRecordTemplate('nutricao').groups.flatMap(group => group.fields).map(field => field.key))
      .toContain('foodRoutine')
    expect(professionalRecordTemplate('fisioterapia').groups.flatMap(group => group.fields).map(field => field.key))
      .toContain('functionalLimitations')
    expect(professionalRecordTemplate('odontologia').groups.flatMap(group => group.fields).map(field => field.key))
      .toContain('dentalHistory')
  })

  it('não entrega campos clínicos de outra área para profissão desconhecida', () => {
    expect(professionalRecordTemplate('outra_area').groups).toEqual([])
  })
})

describe('docTypesFor', () => {
  it('atestado aparece apenas para psicologia', () => {
    expect(docTypesFor('psicologia')).toContain('atestado')
    expect(docTypesFor('fisioterapia')).not.toContain('atestado')
    expect(docTypesFor('nutricao')).not.toContain('atestado')
  })

  it('relatorio aparece para psicologia, fisioterapia e nutricao', () => {
    expect(docTypesFor('psicologia')).toContain('relatorio')
    expect(docTypesFor('fisioterapia')).toContain('relatorio')
    expect(docTypesFor('nutricao')).toContain('relatorio')
  })

  it('encaminhamento, declaracao e recibo aparecem para todas as profissoes', () => {
    const base = ['encaminhamento', 'declaracao', 'recibo'] as const
    const profissoes = ['psicologia', 'fisioterapia', 'nutricao', 'terapia_ocupacional', 'fonoaudiologia', 'odontologia']
    for (const docType of base) {
      for (const profession of profissoes) {
        expect(docTypesFor(profession), `${docType} ausente em ${profession}`).toContain(docType)
      }
    }
  })

  it('sem profissao (conta antiga) cai em psicologia e inclui atestado', () => {
    // hasPsychologyModules usa ?? — só null e undefined ativam o padrão psicologia;
    // string vazia permanece '' e não satisfaz nenhuma profissão (retorna apenas base)
    expect(docTypesFor(undefined)).toContain('atestado')
    expect(docTypesFor(null)).toContain('atestado')
  })

  it('string vazia nao aciona modulos de psicologia (comportamento distinto de null)', () => {
    // '' não é coagido para psicologia por ?? — resulta apenas nos tipos base
    expect(docTypesFor('')).not.toContain('atestado')
    expect(docTypesFor('')).not.toContain('relatorio')
    expect(docTypesFor('')).toContain('declaracao')
  })

  it('fisioterapia nao tem atestado', () => {
    expect(docTypesFor('fisioterapia')).not.toContain('atestado')
  })

  it('nutricao nao tem atestado', () => {
    expect(docTypesFor('nutricao')).not.toContain('atestado')
  })
})
