import { INestApplication } from '@nestjs/common'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as request from 'supertest'
import { createTestApp } from '../../setup'
import { WebhookEvent } from '../../../src/modules/billing/entities/webhook-event.entity'

describe('Webhook Asaas — idempotência por eventId', () => {
  let app: INestApplication
  let webhookEvents: Repository<WebhookEvent>

  beforeAll(async () => {
    app = await createTestApp()
    webhookEvents = app.get(getRepositoryToken(WebhookEvent))
  })

  afterAll(async () => {
    if (app) await app.close()
  })

  it('processa a primeira entrega e ignora repetições do mesmo eventId', async () => {
    const payload = { event: 'PAYMENT_RECEIVED', payment: { id: 'pay_test_idempotency_1' } }
    const headers = { 'asaas-access-token': process.env.ASAAS_WEBHOOK_TOKEN as string }

    const first = await request(app.getHttpServer()).post('/api/billing/webhook').set(headers).send(payload)
    expect(first.status).toBe(200)

    const second = await request(app.getHttpServer()).post('/api/billing/webhook').set(headers).send(payload)
    expect([200, 409]).toContain(second.status)

    // O formato exato do eventId é interno ao serviço (BillingWebhookService.getEventId)
    // — o que importa é que só existe 1 registro pro payload enviado duas vezes.
    // sanitizeWebhookPayload achata payment.id em paymentId antes de persistir.
    const matching = await webhookEvents
      .createQueryBuilder('e')
      .where(`e.payload->>'paymentId' = :paymentId`, { paymentId: 'pay_test_idempotency_1' })
      .getMany()
    expect(matching).toHaveLength(1)
  })
})
