import { BadRequestException } from '@nestjs/common'

export const AVATAR_UPLOAD_OPTIONS = {
  limits: {
    fileSize: 1024 * 1024,
    files: 1,
    fields: 0,
    // Busboy emits partsLimit when the count reaches the configured value.
    // Two permits the single expected file while fields/files limits still
    // reject any additional multipart payload.
    parts: 2,
    fieldNameSize: 32,
    fieldSize: 0,
  },
  fileFilter: (_req: unknown, file: Express.Multer.File, cb: (error: Error | null, acceptFile: boolean) => void) => {
    if (!['image/jpeg', 'image/jpg'].includes(file.mimetype)) {
      cb(new BadRequestException('A foto precisa ser um arquivo JPG'), false)
      return
    }
    cb(null, true)
  },
}
