import { BadRequestException } from '@nestjs/common'
import { TestimonialService } from '../testimonial.service'

describe('TestimonialService', () => {
  const repo = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
  }
  const dataSource = {
    query: jest.fn(),
  }
  let service: TestimonialService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new TestimonialService(repo as any, dataSource as any)
  })

  it('does not ask again after a response or dismissal', async () => {
    dataSource.query.mockResolvedValue([{
      hasRecord: true,
      daysSince: 60,
      patients: 20,
      sessions: 40,
    }])

    await expect(service.getStatus('user-1')).resolves.toEqual({ shouldShow: false })
    expect(dataSource.query).toHaveBeenCalled()
  })

  it('requires a rating when the feedback is not dismissed', async () => {
    repo.findOne.mockResolvedValue(null)

    await expect(service.create('user-1', { text: 'Bom produto' }))
      .rejects.toBeInstanceOf(BadRequestException)
  })

  it('stores explicit public consent only when there is testimonial text', async () => {
    repo.findOne.mockResolvedValue(null)
    repo.save.mockResolvedValue(undefined)

    await service.create('user-1', {
      rating: 5,
      text: '  Organizou minha rotina.  ',
      publicConsent: true,
    })

    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1',
      rating: 5,
      text: 'Organizou minha rotina.',
      publicConsent: true,
      publicIdentityConsent: false,
      publicConsentAt: expect.any(Date),
      publicConsentVersion: '2026-08-13',
      approvedForPublic: false,
    }))
  })

  it('snapshots professional identity only with separate consent', async () => {
    repo.findOne.mockResolvedValue(null)
    repo.save.mockResolvedValue(undefined)
    dataSource.query.mockResolvedValue([{ name: 'Ana Exemplo', crp: '02/12345', specialty: 'TCC', avatarUrl: 'https://cdn.example/avatar.jpg' }])

    await service.create('user-1', {
      rating: 5,
      text: 'Organizou minha rotina.',
      publicConsent: true,
      publicIdentityConsent: true,
      publicCity: 'Recife',
    })

    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({
      publicIdentityConsent: true,
      publicDisplayName: 'Ana Exemplo',
      publicCrp: '02/12345',
      publicSpecialty: 'TCC',
      publicCity: 'Recife',
      publicAvatarUrl: 'https://cdn.example/avatar.jpg',
    }))
  })

  it('blocks public approval without explicit consent', async () => {
    repo.findOne.mockResolvedValue({
      id: 'testimonial-1',
      text: 'Feedback interno',
      publicConsent: false,
      approvedForPublic: false,
    })

    await expect(service.setApproved('testimonial-1', true))
      .rejects.toBeInstanceOf(BadRequestException)
    expect(repo.save).not.toHaveBeenCalled()
  })
})
