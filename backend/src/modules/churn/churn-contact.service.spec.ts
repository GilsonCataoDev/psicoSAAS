import { BadRequestException, NotFoundException } from '@nestjs/common'
import { ChurnContactService } from './churn-contact.service'

describe('ChurnContactService', () => {
  const findOne = jest.fn()
  const sendDirectWhatsApp = jest.fn()
  const service = new ChurnContactService(
    { findOne } as any,
    { sendDirectWhatsApp } as any,
  )

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('gera no servidor uma mensagem segura sem expor o diagnóstico interno', async () => {
    findOne.mockResolvedValue({ id: 'psi-1', name: 'Ana Souza', phone: '(87) 99922-9780' })
    sendDirectWhatsApp.mockResolvedValue({ sent: true })

    await service.sendReactivationWhatsApp('psi-1', 'admin-1')

    const sentText = sendDirectWhatsApp.mock.calls[0][1] as string
    expect(sentText).toContain('Olá, Ana!')
    expect(sentText).not.toMatch(/diagnóstico|risco|score|cancelamento/i)
  })

  it('busca e usa o telefone atual da conta', async () => {
    findOne.mockResolvedValue({ id: 'psi-1', name: 'Ana Souza', phone: '(87) 99922-9780' })
    sendDirectWhatsApp.mockResolvedValue({ sent: true })

    await expect(service.sendReactivationWhatsApp('psi-1', 'admin-1'))
      .resolves.toEqual({ sent: true })

    expect(findOne).toHaveBeenCalledWith({
      where: { id: 'psi-1', isActive: true },
      select: ['id', 'name', 'phone'],
    })
    expect(sendDirectWhatsApp).toHaveBeenCalledWith(
      '5587999229780',
      expect.stringContaining('Olá, Ana!'),
      'admin-1',
      { type: 'churn_reactivation' },
    )
  })

  it.each([null, '', '1234'])('bloqueia telefone ausente ou inválido: %p', async (phone) => {
    findOne.mockResolvedValue({ id: 'psi-1', phone })

    await expect(service.sendReactivationWhatsApp('psi-1', 'admin-1'))
      .rejects.toBeInstanceOf(BadRequestException)
    expect(sendDirectWhatsApp).not.toHaveBeenCalled()
  })

  it('bloqueia conta inexistente ou inativa', async () => {
    findOne.mockResolvedValue(null)

    await expect(service.sendReactivationWhatsApp('psi-1', 'admin-1'))
      .rejects.toBeInstanceOf(NotFoundException)
    expect(sendDirectWhatsApp).not.toHaveBeenCalled()
  })
})
