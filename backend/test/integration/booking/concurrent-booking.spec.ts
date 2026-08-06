import { INestApplication, ConflictException } from '@nestjs/common'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { createTestApp, createTestUser } from '../../setup'
import { bookingPageFactory } from '../../factories/booking-page.factory'
import { BookingService } from '../../../src/modules/booking/booking.service'
import { Booking } from '../../../src/modules/booking/entities/booking.entity'
import { BookingPage } from '../../../src/modules/booking/entities/booking-page.entity'
import { AvailabilitySlot } from '../../../src/modules/availability/entities/availability-slot.entity'

const MONDAY = 1

function nextWeekdayIso(weekday: number): string {
  const d = new Date()
  const diff = ((weekday - d.getDay()) + 7) % 7 || 7 // sempre no futuro, nunca hoje
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

describe('BookingService — reserva concorrente do mesmo horário', () => {
  let app: INestApplication
  let bookingService: BookingService
  let bookingPages: Repository<BookingPage>
  let bookings: Repository<Booking>
  let availabilitySlots: Repository<AvailabilitySlot>

  beforeAll(async () => {
    app = await createTestApp()
    bookingService = app.get(BookingService)
    bookingPages = app.get(getRepositoryToken(BookingPage))
    bookings = app.get(getRepositoryToken(Booking))
    availabilitySlots = app.get(getRepositoryToken(AvailabilitySlot))
  })

  afterAll(async () => {
    if (app) await app.close()
  })

  it('permite apenas 1 de 5 reservas simultâneas para o mesmo horário (pg_advisory_xact_lock)', async () => {
    const { user } = await createTestUser(app)
    const page = await bookingPages.save(bookingPages.create(bookingPageFactory({ psychologistId: user.id })))
    await availabilitySlots.save(availabilitySlots.create({
      weekday: MONDAY,
      startTime: '09:00',
      endTime: '10:00',
      modality: 'online',
      isActive: true,
      psychologistId: user.id,
    }))

    const date = nextWeekdayIso(MONDAY)
    const attempts = Array.from({ length: 5 }, (_, i) => bookingService.createBooking(page.slug, {
      patientName: `Paciente ${i}`,
      patientEmail: `paciente-${i}@example.com`,
      date,
      time: '09:00',
      modality: 'online',
    } as any))

    const results = await Promise.allSettled(attempts)

    const fulfilled = results.filter(r => r.status === 'fulfilled')
    const rejected = results.filter(r => r.status === 'rejected')

    expect(fulfilled).toHaveLength(1)
    expect(rejected).toHaveLength(4)
    for (const r of rejected as PromiseRejectedResult[]) {
      expect(r.reason).toBeInstanceOf(ConflictException)
    }

    // Não filtra por `time` na query: coluna Postgres tipo TIME pode retornar
    // "09:00:00" do driver mesmo tendo sido salva como "09:00" — só existe um
    // slot de disponibilidade nesse dia, então contar por data+status já é
    // inequívoco.
    const confirmedCount = await bookings.count({
      where: { psychologistId: user.id, date, status: 'confirmed' },
    })
    expect(confirmedCount).toBe(1)
  })
})
