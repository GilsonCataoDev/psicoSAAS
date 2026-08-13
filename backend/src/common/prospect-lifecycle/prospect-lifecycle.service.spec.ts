import { Brackets } from 'typeorm'
import { ProspectLifecycleService } from './prospect-lifecycle.service'

const makeQuery = (result: any) => {
  const query: any = {
    where: jest.fn(() => query),
    andWhere: jest.fn((condition: any) => {
      if (condition instanceof Brackets) {
        const nested: any = {
          where: jest.fn(() => nested),
          orWhere: jest.fn(() => nested),
        }
        condition.whereFactory(nested)
      }
      return query
    }),
    orderBy: jest.fn(() => query),
    getOne: jest.fn().mockResolvedValue(result),
  }
  return query
}

const makeService = (prospect: any = null) => {
  const query = makeQuery(prospect)
  const prospects = {
    createQueryBuilder: jest.fn(() => query),
    findOne: jest.fn().mockResolvedValue(prospect),
    save: jest.fn(async value => value),
  }
  const activities = {
    create: jest.fn(value => value),
    save: jest.fn(async value => value),
  }
  return {
    service: new ProspectLifecycleService(prospects as any, activities as any),
    prospects,
    activities,
    query,
  }
}

describe('ProspectLifecycleService', () => {
  it('vincula o cadastro e marca o prospect como registrado', async () => {
    const prospect: any = { id: 'prospect-1', status: 'interested', linkedUserId: null, registeredAt: null }
    const { service, prospects, activities } = makeService(prospect)

    await expect(service.markRegistered({
      userId: 'user-1', email: ' PSI@EXAMPLE.COM ', phone: '+55 (87) 99999-0000',
    })).resolves.toBe(true)

    expect(prospect).toEqual(expect.objectContaining({ linkedUserId: 'user-1', status: 'registered' }))
    expect(prospect.registeredAt).toBeInstanceOf(Date)
    expect(prospects.save).toHaveBeenCalledWith(prospect)
    expect(activities.save).toHaveBeenCalledWith(expect.objectContaining({
      prospectId: 'prospect-1', action: 'status_changed', metadata: expect.objectContaining({ to: 'registered' }),
    }))
  })

  it('nao altera nada quando nao encontra prospect compativel', async () => {
    const { service, prospects, activities } = makeService(null)
    await expect(service.markRegistered({ userId: 'user-1', email: 'novo@example.com' })).resolves.toBe(false)
    expect(prospects.save).not.toHaveBeenCalled()
    expect(activities.save).not.toHaveBeenCalled()
  })

  it('nao consulta o banco sem identificador profissional', async () => {
    const { service, prospects } = makeService(null)
    await expect(service.markRegistered({ userId: 'user-1' })).resolves.toBe(false)
    expect(prospects.createQueryBuilder).not.toHaveBeenCalled()
  })

  it('marca como ativado usando apenas o id da conta', async () => {
    const prospect: any = {
      id: 'prospect-1', status: 'registered', linkedUserId: 'user-1',
      registeredAt: new Date(), activatedAt: null, deletedAt: null, doNotContact: false,
    }
    const { service, prospects, activities } = makeService(prospect)

    await expect(service.markActivated('user-1')).resolves.toBe(true)

    expect(prospects.findOne).toHaveBeenCalledWith({ where: { linkedUserId: 'user-1', doNotContact: false } })
    expect(prospect.status).toBe('activated')
    expect(prospect.activatedAt).toBeInstanceOf(Date)
    expect(activities.save).toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({ from: 'registered', to: 'activated' }),
    }))
  })

  it('e idempotente quando o prospect ja esta ativado', async () => {
    const prospect: any = { id: 'prospect-1', status: 'activated', linkedUserId: 'user-1', deletedAt: null }
    const { service, prospects, activities } = makeService(prospect)
    await expect(service.markActivated('user-1')).resolves.toBe(false)
    expect(prospects.save).not.toHaveBeenCalled()
    expect(activities.save).not.toHaveBeenCalled()
  })
})
