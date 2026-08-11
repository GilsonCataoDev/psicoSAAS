import { ConflictException, Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, IsNull, Repository } from 'typeorm'
import { Subscription } from '../billing/entities/subscription.entity'
import { EmailService } from '../email/email.service'

interface ProOfferRecipient {
  subscriptionId: string
  name: string
  email: string
}

@Injectable()
export class AdminCampaignService {
  private readonly logger = new Logger(AdminCampaignService.name)
  private readonly campaignLock = 'usecognia:campaign:pro3790'

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Subscription) private readonly subscriptions: Repository<Subscription>,
    private readonly email: EmailService,
  ) {}

  async sendProUpgradeOffer(): Promise<{ eligible: number; sent: number; failed: number }> {
    const [lock] = await this.dataSource.query<Array<{ locked: boolean }>>(
      'SELECT pg_try_advisory_lock(hashtext($1)) AS locked',
      [this.campaignLock],
    )
    if (!lock?.locked) throw new ConflictException('Esta campanha já está sendo enviada')

    try {
      const recipients = await this.dataSource.query<ProOfferRecipient[]>(`
        SELECT s.id AS "subscriptionId", u.name, u.email
        FROM billing_subscriptions s
        INNER JOIN users u ON u.id = s."userId"
        WHERE s.id = (
          SELECT latest.id
          FROM billing_subscriptions latest
          WHERE latest."userId" = u.id
          ORDER BY latest."createdAt" DESC
          LIMIT 1
        )
          AND s.plan = 'free'
          AND s.status = 'active'
          AND s."upgradeOfferEmailedAt" IS NULL
          AND s."activationOfferRedeemedAt" IS NULL
          AND u."isActive" = true
          AND u."emailVerified" = true
          AND COALESCE(u.preferences->>'marketingEmails', 'true') <> 'false'
        ORDER BY u."createdAt" ASC
      `)

      let sent = 0
      let failed = 0

      for (const recipient of recipients) {
        const claimedAt = new Date()
        const claimed = await this.subscriptions.update(
          { id: recipient.subscriptionId, upgradeOfferEmailedAt: IsNull() },
          { upgradeOfferEmailedAt: claimedAt },
        )
        if (!claimed.affected) continue

        try {
          await this.email.sendProUpgradeOffer(recipient.name, recipient.email)
          sent += 1
        } catch (error) {
          failed += 1
          await this.subscriptions.update(
            { id: recipient.subscriptionId, upgradeOfferEmailedAt: claimedAt },
            { upgradeOfferEmailedAt: null },
          )
          this.logger.warn(`pro_offer_email_failed subscriptionId=${recipient.subscriptionId} type=${error instanceof Error ? error.name : 'unknown'}`)
        }
      }

      this.logger.log(`pro_offer_campaign eligible=${recipients.length} sent=${sent} failed=${failed}`)
      return { eligible: recipients.length, sent, failed }
    } finally {
      await this.dataSource.query('SELECT pg_advisory_unlock(hashtext($1))', [this.campaignLock])
    }
  }
}
