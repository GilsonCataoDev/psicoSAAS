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

  it('busca e usa o telefone atual da conta', async () => {
    findOne.mockResolvedValue({ id: 'psi-1', phone: '(87) 99922-9780' })
    sendDirectWhatsApp.mockResolvedValue({ sent: true })

    await expect(service.sendWhatsApp('psi-1', '  Mensagem segura  ', 'admin-1'))
      .resolves.toEqual({ sent: true })

    expect(findOne).toHaveBeenCalledWith({
      where: { id: 'psi-1', isActive: true },
      select: ['id', 'phone'],
    })
    expect(sendDirectWhatsApp).toHaveBeenCalledWith(
      '5587999229780',
      'Mensagem segura',
      'admin-1',
      { type: 'churn_admin_message' },
    )
  })

  it.each([null, '', '1234'])('bloqueia telefone ausente ou inválido: %p', async (phone) => {
    findOne.mockResolvedValue({ id: 'psi-1', phone })

    await expect(service.sendWhatsApp('psi-1', 'Mensagem', 'admin-1'))
      .rejects.toBeInstanceOf(BadRequestException)
    expect(sendDirectWhatsApp).not.toHaveBeenCalled()
  })

  it('bloqueia conta inexistente ou inativa', async () => {
    findOne.mockResolvedValue(null)

    await expect(service.sendWhatsApp('psi-1', 'Mensagem', 'admin-1'))
      .rejects.toBeInstanceOf(NotFoundException)
    expect(sendDirectWhatsApp).not.toHaveBeenCalled()
  })

  it.each(['   ', 'x'.repeat(2001)])('bloqueia mensagem inválida', async (message) => {
    findOne.mockResolvedValue({ id: 'psi-1', phone: '87999229780' })

    await expect(service.sendWhatsApp('psi-1', message, 'admin-1'))
      .rejects.toBeInstanceOf(BadRequestException)
    expect(sendDirectWhatsApp).not.toHaveBeenCalled()
  })
})
