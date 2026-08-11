import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { TestWhatsAppDto } from './test-whatsapp.dto'

describe('TestWhatsAppDto', () => {
  it('normaliza um telefone formatado antes de validar', async () => {
    const dto = plainToInstance(TestWhatsAppDto, { phone: '(87) 99922-9780' })
    await expect(validate(dto)).resolves.toHaveLength(0)
    expect(dto.phone).toBe('87999229780')
  })

  it('rejeita telefone curto', async () => {
    const dto = plainToInstance(TestWhatsAppDto, { phone: '1234' })
    expect(await validate(dto)).not.toHaveLength(0)
  })
})
