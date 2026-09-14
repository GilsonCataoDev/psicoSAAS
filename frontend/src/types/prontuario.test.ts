import { describe, expect, it } from 'vitest'
import { professionalRecordTemplate } from './prontuario'

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
