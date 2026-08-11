import { BadRequestException } from '@nestjs/common'
import { MessageProviderFactory } from './message-provider.factory'

describe('MessageProviderFactory', () => {
  const originalProvider = process.env.PROSPECTING_MESSAGE_PROVIDER

  afterEach(() => {
    if (originalProvider === undefined) {
      delete process.env.PROSPECTING_MESSAGE_PROVIDER
    } else {
      process.env.PROSPECTING_MESSAGE_PROVIDER = originalProvider
    }
  })

  it('does not fake external channel sends by default', () => {
    delete process.env.PROSPECTING_MESSAGE_PROVIDER
    const factory = new MessageProviderFactory({} as any, { canSend: jest.fn() } as any)

    expect(() => factory.getProvider('whatsapp')).toThrow(BadRequestException)
  })

  it('allows the explicit mock provider only when configured', () => {
    process.env.PROSPECTING_MESSAGE_PROVIDER = 'mock'
    const mock = { canSend: jest.fn().mockReturnValue(true) }
    const factory = new MessageProviderFactory({} as any, mock as any)

    expect(factory.getProvider('whatsapp')).toBe(mock)
  })
})
