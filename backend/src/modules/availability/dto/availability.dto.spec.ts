import 'reflect-metadata'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import {
  BlockedDateDto,
  ExtraAvailabilitySlotDto,
  SaveAvailabilitySlotsDto,
} from './availability.dto'

describe('Availability DTOs', () => {
  it('aceita horários semanais válidos', async () => {
    const dto = plainToInstance(SaveAvailabilitySlotsDto, {
      slots: [{ weekday: 1, startTime: '08:00', endTime: '12:00', modality: 'online' }],
    })
    await expect(validate(dto)).resolves.toHaveLength(0)
  })

  it('rejeita dia da semana, hora e modalidade inválidos', async () => {
    const dto = plainToInstance(SaveAvailabilitySlotsDto, {
      slots: [{ weekday: 8, startTime: '25:00', endTime: '12:00', modality: 'telefone' }],
    })
    expect(await validate(dto)).not.toHaveLength(0)
  })

  it('rejeita data ou motivo fora do contrato', async () => {
    const extra = plainToInstance(ExtraAvailabilitySlotDto, {
      date: '30/07/2026',
      startTime: '08:00',
      endTime: '09:00',
    })
    const blocked = plainToInstance(BlockedDateDto, {
      date: '2026-07-30',
      reason: 'x'.repeat(256),
    })
    expect(await validate(extra)).not.toHaveLength(0)
    expect(await validate(blocked)).not.toHaveLength(0)
  })
})
