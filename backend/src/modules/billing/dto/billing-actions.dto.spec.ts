import 'reflect-metadata'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import {
  SubscribeDto,
  TokenizeCreditCardDto,
  UpdateCardDto,
} from './billing-actions.dto'

describe('Billing action DTOs', () => {
  it('aceita assinatura válida e rejeita plano desconhecido', async () => {
    const valid = plainToInstance(SubscribeDto, {
      plan: 'pro',
      creditCardToken: 'token-seguro-123',
    })
    const invalid = plainToInstance(SubscribeDto, {
      plan: 'premium',
      creditCardToken: 'curto',
    })
    await expect(validate(valid)).resolves.toHaveLength(0)
    expect(await validate(invalid)).not.toHaveLength(0)
  })

  it('aceita inicio do trial sem token de cartao', async () => {
    const dto = plainToInstance(SubscribeDto, { plan: 'pro' })
    await expect(validate(dto)).resolves.toHaveLength(0)
  })

  it('aceita atualização de cartão sem trocar o plano', async () => {
    const dto = plainToInstance(UpdateCardDto, {
      creditCardToken: 'token-seguro-123',
    })
    await expect(validate(dto)).resolves.toHaveLength(0)
  })

  it('valida o formato mínimo dos dados enviados para tokenização', async () => {
    const dto = plainToInstance(TokenizeCreditCardDto, {
      creditCard: {
        holderName: 'Pessoa Teste',
        number: '4111111111111111',
        expiryMonth: '12',
        expiryYear: '2030',
        ccv: '123',
      },
      creditCardHolderInfo: {
        name: 'Pessoa Teste',
        cpfCnpj: '12345678901',
        postalCode: '55290000',
        addressNumber: '10',
        phone: '87999999999',
      },
    })
    await expect(validate(dto)).resolves.toHaveLength(0)
  })
})
