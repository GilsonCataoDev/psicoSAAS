import 'reflect-metadata'
import { validate } from 'class-validator'
import { UpdateAppointmentStatusDto } from './update-appointment.dto'

describe('UpdateAppointmentStatusDto', () => {
  it.each(['scheduled', 'completed', 'cancelled', 'no_show'])('aceita status %s', async (status) => {
    const dto = Object.assign(new UpdateAppointmentStatusDto(), { status })
    await expect(validate(dto)).resolves.toHaveLength(0)
  })

  it('rejeita status desconhecido', async () => {
    const dto = Object.assign(new UpdateAppointmentStatusDto(), { status: 'deleted' })
    expect(await validate(dto)).not.toHaveLength(0)
  })
})
