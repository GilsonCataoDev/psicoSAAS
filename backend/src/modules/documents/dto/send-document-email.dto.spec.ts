import { validate } from 'class-validator'
import { SendDocumentEmailDto } from './send-document-email.dto'

describe('SendDocumentEmailDto', () => {
  it('aceita e-mail válido e rejeita destinatário inválido', async () => {
    const valid = Object.assign(new SendDocumentEmailDto(), { to: 'psi@example.com' })
    const invalid = Object.assign(new SendDocumentEmailDto(), { to: 'destinatario-invalido' })

    await expect(validate(valid)).resolves.toHaveLength(0)
    expect(await validate(invalid)).not.toHaveLength(0)
  })
})
