import { getMetadataArgsStorage } from 'typeorm'
import { ProspectMessage } from './prospect-message.entity'

describe('ProspectMessage entity metadata', () => {
  it('does not configure an unsupported length on the PostgreSQL text column', () => {
    const contentColumn = getMetadataArgsStorage().columns.find(
      column => column.target === ProspectMessage && column.propertyName === 'content',
    )

    expect(contentColumn?.options.type).toBe('text')
    expect(contentColumn?.options.length).toBeUndefined()
  })
})
