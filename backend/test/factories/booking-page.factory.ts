import { DeepPartial } from 'typeorm'
import { randomBytes } from 'crypto'
import { BookingPage } from '../../src/modules/booking/entities/booking-page.entity'

/** Builder de BookingPage com valores padrão sensatos para testes de integração. */
export function bookingPageFactory(overrides: DeepPartial<BookingPage> & { psychologistId: string }): DeepPartial<BookingPage> {
  return {
    slug: `psi-teste-${randomBytes(4).toString('hex')}`,
    isActive: true,
    sessionPrice: 150,
    sessionDuration: 50,
    presencialSessionDuration: 50,
    onlineSessionDuration: 50,
    slotInterval: 50,
    presencialSlotInterval: 10,
    onlineSlotInterval: 0,
    allowPresencial: true,
    allowOnline: true,
    minAdvanceDays: 0,
    maxAdvanceDays: 60,
    // Evita flakiness quando a data de teste (ex.: "próxima segunda") cai no mês seguinte.
    allowNextMonthBooking: true,
    requirePaymentUpfront: false,
    ...overrides,
  }
}
