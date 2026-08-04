import { BadRequestException, ForbiddenException } from '@nestjs/common'
import { SessionsController } from './sessions.controller'

function usageRepository(updateAffected = 1, callTranscriptions = 0) {
  let operation = ''
  const builder: any = {}
  builder.insert = jest.fn(() => { operation = 'insert'; return builder })
  builder.update = jest.fn(() => { operation = 'update'; return builder })
  builder.values = jest.fn(() => builder)
  builder.orIgnore = jest.fn(() => builder)
  builder.set = jest.fn(() => builder)
  builder.where = jest.fn(() => builder)
  builder.execute = jest.fn(async () => operation === 'update' ? { affected: updateAffected } : {})

  return {
    repository: {
      createQueryBuilder: jest.fn(() => builder),
      findOne: jest.fn(async () => ({ callTranscriptions })),
    } as any,
    builder,
  }
}

function makeController(opts: {
  plan?: 'free' | 'pro'
  updateAffected?: number
  callTranscriptions?: number
  transcribeAudio?: jest.Mock
}) {
  const usage = usageRepository(opts.updateAffected ?? 1, opts.callTranscriptions ?? 0)
  const planAccess = { getCurrentPlan: jest.fn().mockResolvedValue(opts.plan ?? 'pro') } as any
  const ai = { transcribeAudio: opts.transcribeAudio ?? jest.fn().mockResolvedValue('texto transcrito') } as any
  const controller = new SessionsController(
    {} as any,
    ai,
    {} as any,
    usage.repository,
    planAccess,
  )
  return { controller, usage, ai }
}

const file = { buffer: Buffer.from('audio'), mimetype: 'audio/webm' } as Express.Multer.File
const req = { user: { id: 'user-1', email: 'psi@example.com' } }

describe('SessionsController.transcribeCall', () => {
  it('recusa sem arquivo de áudio', async () => {
    const { controller } = makeController({})
    await expect(controller.transcribeCall(undefined as any, '600', req))
      .rejects.toBeInstanceOf(BadRequestException)
  })

  it('recusa duração ausente ou acima de 90 minutos', async () => {
    const { controller } = makeController({})
    await expect(controller.transcribeCall(file, '', req)).rejects.toBeInstanceOf(BadRequestException)
    await expect(controller.transcribeCall(file, String(91 * 60), req)).rejects.toBeInstanceOf(BadRequestException)
  })

  it('bloqueia conta Free antes de gastar cota', async () => {
    const { controller, usage } = makeController({ plan: 'free' })
    await expect(controller.transcribeCall(file, '600', req)).rejects.toBeInstanceOf(ForbiddenException)
    expect(usage.repository.createQueryBuilder).not.toHaveBeenCalled()
  })

  it('cobra 1 unidade da cota mensal e transcreve para conta Pro', async () => {
    const { controller, usage, ai } = makeController({ plan: 'pro' })
    const result = await controller.transcribeCall(file, '2400', req)
    expect(result).toEqual({ text: 'texto transcrito' })
    expect(usage.builder.set).toHaveBeenCalledWith({ callTranscriptions: expect.any(Function) })
    expect(ai.transcribeAudio).toHaveBeenCalledWith(file.buffer, file.mimetype)
  })

  it('recusa quando a cota mensal de chamadas já foi atingida', async () => {
    const { controller } = makeController({ plan: 'pro', updateAffected: 0, callTranscriptions: 30 })
    await expect(controller.transcribeCall(file, '600', req)).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('devolve a cota reservada quando a transcrição falha', async () => {
    const transcribeAudio = jest.fn().mockRejectedValue(new Error('provider offline'))
    const { controller, usage } = makeController({ plan: 'pro', transcribeAudio })
    await expect(controller.transcribeCall(file, '600', req)).rejects.toThrow('provider offline')
    const releaseSet = usage.builder.set.mock.calls.find((call: any[]) => 'callTranscriptions' in call[0])
    expect(releaseSet).toBeDefined()
  })
})
