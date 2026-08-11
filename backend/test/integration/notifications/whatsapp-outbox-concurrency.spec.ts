import { INestApplication } from '@nestjs/common'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { createTestApp, createTestUser } from '../../setup'
import { NotificationsService } from '../../../src/modules/notifications/notifications.service'
import { WhatsAppOutbox } from '../../../src/modules/notifications/entities/whatsapp-outbox.entity'

describe('WhatsApp outbox - concorrencia real no PostgreSQL', () => {
  let app: INestApplication
  let notifications: NotificationsService
  let outbox: Repository<WhatsAppOutbox>

  beforeAll(async () => {
    app = await createTestApp()
    notifications = app.get(NotificationsService)
    outbox = app.get(getRepositoryToken(WhatsAppOutbox))
  })

  afterAll(async () => {
    jest.restoreAllMocks()
    if (app) await app.close()
  })

  it('permite que apenas uma de duas instancias envie a mesma mensagem', async () => {
    const { user } = await createTestUser(app, { email: 'gilsonfilho96@outlook.com' })
    const appointment = {
      id: 'ae53977e-75ec-4ae9-b87b-e994feacfe73',
      psychologistId: user.id,
      date: '2026-08-12',
      time: '14:00',
      patient: {
        id: 'patient-concurrency',
        name: 'Marina Silva',
        phone: '11999999999',
      },
      psychologist: { preferences: {} },
    }
    const provider = jest.spyOn(global, 'fetch').mockImplementation(async (_url, init: any) => {
      const body = JSON.parse(init.body)
      return new Response(JSON.stringify({
        key: { id: 'provider-once' },
        message: { conversation: body.text },
        status: 'PENDING',
      }), { status: 201, headers: { 'Content-Type': 'application/json' } })
    })

    await Promise.all([
      notifications.sendAppointmentReminder(appointment, '24h'),
      notifications.sendAppointmentReminder(appointment, '24h'),
    ])

    const sendTextCalls = provider.mock.calls.filter(([url]) => String(url).includes('/message/sendText/'))
    expect(sendTextCalls).toHaveLength(1)
    const records = await outbox.find()
    expect(records).toHaveLength(1)
    expect(records[0]).toEqual(expect.objectContaining({
      attempts: 1,
      status: 'delivery_unknown',
      providerMessageId: 'provider-once',
    }))
  })
})
