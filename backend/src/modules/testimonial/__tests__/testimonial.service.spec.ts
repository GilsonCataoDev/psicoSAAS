import { BadRequestException } from '@nestjs/common'
import { TestimonialService } from '../testimonial.service'

describe('TestimonialService', () => {
  const repo = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
  }
  const users = { findOne: jest.fn() }
  const patients = { count: jest.fn() }
  const sessions = { count: jest.fn() }
  let service: TestimonialService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new TestimonialService(repo as any, users as any, patients as any, sessions as any)
  })

  it('does not ask again after a response or dismissal', async () => {
    repo.findOne.mockResolvedValue({ id: 'existing' })

    await expect(service.getStatus('user-1')).resolves.toEqual({ shouldShow: false })
    expect(users.findOne).not.toHaveBeenCalled()
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
      approvedForPublic: false,
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
