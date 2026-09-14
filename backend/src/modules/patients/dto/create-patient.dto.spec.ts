import 'reflect-metadata'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { CreatePatientDto } from './create-patient.dto'

function makeDto(prontuario?: Record<string, unknown>) {
  return plainToInstance(CreatePatientDto, { name: 'Pessoa Teste', prontuario })
}

describe('CreatePatientDto — campos profissionais', () => {
  it('aceita campos simples de ficha profissional', async () => {
    const dto = makeDto({ professionalFields: { mainGoal: 'Melhorar a rotina alimentar' } })
    const errors = await validate(dto)
    expect(errors).toEqual([])
  })

  it('rejeita objeto aninhado para evitar payload clínico sem limite', async () => {
    const dto = makeDto({ professionalFields: { mainGoal: { text: 'não permitido' } } })
    const errors = await validate(dto)
    expect(errors.some(error => error.property === 'prontuario')).toBe(true)
  })

  it('rejeita mais de 16 campos profissionais', async () => {
    const fields = Object.fromEntries(Array.from({ length: 17 }, (_, index) => [`field${index}`, 'valor']))
    const dto = makeDto({ professionalFields: fields })
    const errors = await validate(dto)
    expect(errors.some(error => error.property === 'prontuario')).toBe(true)
  })
})
