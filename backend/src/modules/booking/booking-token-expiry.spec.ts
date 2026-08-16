import { BadRequestException } from '@nestjs/common'
import { BookingService } from './booking.service'

describe('BookingService - expiração de token público', () => {
  function serviceWithBooking(booking: any): BookingService {
    const service = Object.create(BookingService.prototype) as BookingService
    ;(service as any).bookings = {
      findOne: jest.fn()
        .mockResolvedValueOnce(booking)
        .mockResolvedValueOnce(null),
    }
    return service
  }

  it('rejeita link de cancelamento expirado', async () => {
    const service = serviceWithBooking({
      tokenExpiresAt: new Date(Date.now() - 1_000),
    })

    await expect((service as any).findByCancellationToken('token-expirado'))
      .rejects.toBeInstanceOf(BadRequestException)
  })

  it('aceita link de cancelamento dentro da validade', async () => {
    const booking = { tokenExpiresAt: new Date(Date.now() + 60_000) }
    const service = serviceWithBooking(booking)

    await expect((service as any).findByCancellationToken('token-valido'))
      .resolves.toBe(booking)
  })
})
