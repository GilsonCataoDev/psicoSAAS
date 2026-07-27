import { Injectable, Logger } from '@nestjs/common'
import { IMessageProvider } from './message-provider.interface'
import { ManualMessageProvider } from './manual-message.provider'
import { MockMessageProvider } from './mock-message.provider'

@Injectable()
export class MessageProviderFactory {
  private readonly logger = new Logger(MessageProviderFactory.name)

  constructor(
    private readonly manual: ManualMessageProvider,
    private readonly mock: MockMessageProvider,
  ) {}

  getProvider(channel: string): IMessageProvider {
    const env = process.env

    if (channel === 'manual') return this.manual

    const providerMode = env.PROSPECTING_MESSAGE_PROVIDER ?? 'mock'

    if (providerMode === 'mock') {
      if (!this.mock.canSend(channel)) {
        this.logger.warn(`mock_provider_fallback channel=${channel} reverting to manual`)
        return this.manual
      }
      return this.mock
    }

    this.logger.debug(`provider_selection channel=${channel} mode=${providerMode}`)
    return this.manual
  }
}
