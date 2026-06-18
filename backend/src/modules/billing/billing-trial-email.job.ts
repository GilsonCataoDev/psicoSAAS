import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { EmailService } from '../email/email.service'
import { Subscription } from './entities/subscription.entity'

const DAY_MS = 24 * 60 * 60 * 1000

@Injectable()
export class BillingTrialEmailJob implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BillingTrialEmailJob.name)
  private timer?: NodeJS.Timeout

  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptions: Repository<Subscription>,
    private readonly email: EmailService,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => this.run().catch((err) => this.logger.error(err)), DAY_MS)
    setTimeout(() => this.run().catch((err) => this.logger.error(err)), 5000)
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer)
  }

  async run(): Promise<void> {
    const trialing = await this.subscriptions.find({
      where: { status: 'trialing' },
      relations: ['user'],
    })

    for (const subscription of trialing) {
      if (this.email.isRateLimited()) {
        this.logger.warn(
          `Envio de e-mails de trial pausado por limite do provedor. Retry em ${Math.ceil(this.email.getRateLimitRetryAfterMs() / 1000)}s.`,
        )
        break
      }
      if (!subscription.trialEndsAt || !subscription.user?.email) continue

      const daysLeft = Math.ceil(
        (new Date(subscription.trialEndsAt).getTime() - Date.now()) / DAY_MS,
      )

      if (daysLeft === 2) {
        try {
          await this.email.sendTrialEndingReminder(subscription.user.name, subscription.user.email, 2)
        } catch (err: any) {
          if (this.email.isRateLimited()) {
            this.logger.warn(`Envio de e-mails de trial pausado por limite do provedor: ${err?.message}`)
            break
          }
          throw err
        }
      }

      if (daysLeft === 0) {
        try {
          await this.email.send({
            to: subscription.user.email,
            subject: 'Vamos cobrar hoje — UseCognia',
            html: `
              <p>Olá, ${subscription.user.name.split(' ')[0]}.</p>
              <p>Seu teste gratuito termina hoje. A cobrança do plano ${subscription.plan} será feita no cartão cadastrado.</p>
              <p>Se precisar trocar de plano ou cancelar, acesse a área de planos antes da cobrança.</p>
            `,
          })
        } catch (err: any) {
          if (this.email.isRateLimited()) {
            this.logger.warn(`Envio de e-mails de trial pausado por limite do provedor: ${err?.message}`)
            break
          }
          throw err
        }
      }
    }
  }
}
