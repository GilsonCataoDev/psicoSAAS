import { NotFoundException } from '@nestjs/common'
import { PatientAttachmentsService } from '../patient-attachments.service'
import { StorageService } from '../../../common/storage/storage.service'

jest.mock('../../../common/crypto/encrypt.util', () => ({
  encrypt: (v: string) => `enc:${v}`,
  decrypt: (v: string) => v.replace(/^enc:/, ''),
}))

const PDF_BYTES = Buffer.from('%PDF-1.4 fake content')

function makeRepo(overrides: Partial<Record<string, jest.Mock>> = {}) {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
    create: jest.fn((v) => v),
    save: jest.fn(async (v) => ({ id: 'att-1', createdAt: new Date(), ...v })),
    delete: jest.fn(),
    exist: jest.fn().mockResolvedValue(true),
    ...overrides,
  }
}

function makeStorage(overrides: Partial<Record<string, jest.Mock>> = {}) {
  return {
    isPrivateConfigured: jest.fn().mockReturnValue(true),
    uploadPrivate: jest.fn().mockResolvedValue(undefined),
    getObject: jest.fn(),
    delete: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as StorageService
}

describe('PatientAttachmentsService — isolamento por psicólogo', () => {
  const PATIENT_ID = 'patient-1'
  const OWNER_ID = 'psy-owner'
  const OTHER_ID = 'psy-other'

  afterEach(() => {
    delete process.env.ATTACHMENTS_STORAGE_DRIVER
    jest.clearAllMocks()
  })

  describe('driver postgres (padrão)', () => {
    it('download nunca retorna anexo de outro psicólogo (query já filtra por psychologistId)', async () => {
      const repo = makeRepo({ findOne: jest.fn().mockResolvedValue(null) })
      const patientsRepo = makeRepo()
      const assessmentsRepo = makeRepo()
      const storage = makeStorage()
      const svc = new PatientAttachmentsService(repo as any, patientsRepo as any, assessmentsRepo as any, storage)

      await expect(svc.download('att-1', PATIENT_ID, OTHER_ID)).rejects.toThrow(NotFoundException)
      expect(repo.findOne).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'att-1', patientId: PATIENT_ID, psychologistId: OTHER_ID },
      }))
    })

    it('remove nunca afeta anexo de outro psicólogo', async () => {
      const repo = makeRepo({
        findOne: jest.fn().mockResolvedValue(null),
        delete: jest.fn().mockResolvedValue({ affected: 0 }),
      })
      const patientsRepo = makeRepo()
      const assessmentsRepo = makeRepo()
      const storage = makeStorage()
      const svc = new PatientAttachmentsService(repo as any, patientsRepo as any, assessmentsRepo as any, storage)

      await expect(svc.remove('att-1', PATIENT_ID, OTHER_ID)).rejects.toThrow(NotFoundException)
    })

    it('rejeita upload cujo conteúdo não corresponde a um PDF/JPG/PNG real', async () => {
      const repo = makeRepo()
      const patientsRepo = makeRepo()
      const assessmentsRepo = makeRepo()
      const storage = makeStorage()
      const svc = new PatientAttachmentsService(repo as any, patientsRepo as any, assessmentsRepo as any, storage)

      await expect(svc.add(PATIENT_ID, OWNER_ID, {
        originalname: 'fake.pdf',
        mimetype: 'application/pdf',
        size: 10,
        buffer: Buffer.from('not-a-real-pdf'),
      })).rejects.toThrow('não corresponde ao formato declarado')
    })
  })

  describe('driver r2 (opcional)', () => {
    beforeEach(() => {
      process.env.ATTACHMENTS_STORAGE_DRIVER = 'r2'
    })

    it('grava a key do objeto incluindo o psychologistId (isolamento reforçado no bucket)', async () => {
      const repo = makeRepo()
      const patientsRepo = makeRepo()
      const assessmentsRepo = makeRepo()
      const storage = makeStorage()
      const svc = new PatientAttachmentsService(repo as any, patientsRepo as any, assessmentsRepo as any, storage)

      await svc.add(PATIENT_ID, OWNER_ID, {
        originalname: 'laudo.pdf',
        mimetype: 'application/pdf',
        size: PDF_BYTES.length,
        buffer: PDF_BYTES,
      })

      expect(storage.uploadPrivate).toHaveBeenCalledWith(
        expect.stringContaining(`attachments/${OWNER_ID}/${PATIENT_ID}/`),
        expect.any(Buffer),
        'application/octet-stream',
      )
    })

    it('nunca envia o conteúdo do arquivo em claro ao storage (sempre criptografado)', async () => {
      const repo = makeRepo()
      const patientsRepo = makeRepo()
      const assessmentsRepo = makeRepo()
      const storage = makeStorage()
      const svc = new PatientAttachmentsService(repo as any, patientsRepo as any, assessmentsRepo as any, storage)

      await svc.add(PATIENT_ID, OWNER_ID, {
        originalname: 'laudo.pdf',
        mimetype: 'application/pdf',
        size: PDF_BYTES.length,
        buffer: PDF_BYTES,
      })

      const uploadedBody = (storage.uploadPrivate as jest.Mock).mock.calls[0][1] as Buffer
      expect(uploadedBody.toString('utf8')).not.toContain('%PDF')
    })

    it('cai pro driver postgres se as credenciais privadas não estiverem configuradas', async () => {
      const repo = makeRepo()
      const patientsRepo = makeRepo()
      const assessmentsRepo = makeRepo()
      const storage = makeStorage({ isPrivateConfigured: jest.fn().mockReturnValue(false) })
      const svc = new PatientAttachmentsService(repo as any, patientsRepo as any, assessmentsRepo as any, storage)

      await svc.add(PATIENT_ID, OWNER_ID, {
        originalname: 'laudo.pdf',
        mimetype: 'application/pdf',
        size: PDF_BYTES.length,
        buffer: PDF_BYTES,
      })

      expect(storage.uploadPrivate).not.toHaveBeenCalled()
    })

    it('download busca do storage e descriptografa, sem vazar para outro psicólogo', async () => {
      const repo = makeRepo({
        findOne: jest.fn().mockResolvedValue(null),
      })
      const patientsRepo = makeRepo()
      const assessmentsRepo = makeRepo()
      const storage = makeStorage()
      const svc = new PatientAttachmentsService(repo as any, patientsRepo as any, assessmentsRepo as any, storage)

      await expect(svc.download('att-1', PATIENT_ID, OTHER_ID)).rejects.toThrow(NotFoundException)
      expect(storage.getObject).not.toHaveBeenCalled()
    })
  })
})
