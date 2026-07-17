import { Injectable, OnApplicationShutdown } from '@nestjs/common'
import { createHash } from 'crypto'
import { PostHog } from 'posthog-node'

@Injectable()
export class PosthogService implements OnApplicationShutdown {
  readonly client: PostHog

  constructor() {
    this.client = new PostHog(process.env.POSTHOG_PROJECT_TOKEN ?? '', {
      host: process.env.POSTHOG_HOST ?? 'https://us.i.posthog.com',
      flushAt: 1,
      flushInterval: 0,
      enableExceptionAutocapture: true,
    })
  }

  async onApplicationShutdown() {
    await this.client.shutdown()
  }

  /**
   * Derives the same pseudonymous distinct ID used by the frontend analytics.ts
   * so that server-side events are correlated with client-side events in PostHog.
   */
  distinctId(userId: string): string {
    const hash = createHash('sha256').update(`usecognia:${userId}`).digest('hex')
    return `uc_${hash}`
  }

  capture(distinctId: string, event: string, properties?: Record<string, unknown>): void {
    this.client.capture({ distinctId, event, properties })
  }

  async captureAndFlush(distinctId: string, event: string, properties?: Record<string, unknown>): Promise<void> {
    this.client.capture({ distinctId, event, properties })
    await this.client.flush()
  }

  identify(distinctId: string, properties?: Record<string, unknown>): void {
    this.client.identify({ distinctId, properties })
  }

  captureException(error: unknown, distinctId?: string, properties?: Record<string, unknown>): void {
    this.client.captureException(error, distinctId, properties)
  }
}
