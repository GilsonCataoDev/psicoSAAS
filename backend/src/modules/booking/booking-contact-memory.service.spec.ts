import { BookingContactMemoryService } from './booking-contact-memory.service'

process.env.ENCRYPTION_KEY = 'booking-memory-test-key-with-32-chars!'

describe('BookingContactMemoryService', () => {
  const repo = {
    create: jest.fn((value) => value),
    save: jest.fn(async value => ({ id: 'memory-1', ...value })),
    findOne: jest.fn(),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
  }
  const service = new BookingContactMemoryService(repo as any)

  beforeEach(() => jest.clearAllMocks())

  it('guarda dados cifrados e devolve somente uma prévia mascarada', async () => {
    const remembered = await service.remember({
      patientName: 'Maria da Silva',
      patientEmail: 'maria@example.com',
      patientPhone: '87999998888',
    })
    const stored = repo.save.mock.calls[0][0]
    expect(stored.patientName).not.toContain('Maria')
    expect(stored.patientEmail).not.toContain('maria@')
    expect(stored.patientPhone).not.toContain('999998888')

    repo.findOne.mockResolvedValue(stored)
    await expect(service.preview(remembered.token)).resolves.toEqual({
      available: true,
      name: 'Maria',
      email: 'm***@example.com',
      phone: 'final 8888',
    })
  })

  it('não devolve memória expirada', async () => {
    repo.findOne.mockResolvedValue({
      patientName: 'cipher',
      expiresAt: new Date(Date.now() - 1),
    })
    await expect(service.resolve('expired')).resolves.toBeNull()
    expect(repo.delete).toHaveBeenCalled()
  })
})
