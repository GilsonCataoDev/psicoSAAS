import { SetMetadata } from '@nestjs/common'
import { ProfessionCapability } from '../professions'

export const PROFESSION_CAPABILITY_KEY = 'required_profession_capability'

/** Marca uma rota como disponível apenas para uma capacidade profissional. */
export const RequireProfessionCapability = (capability: ProfessionCapability) =>
  SetMetadata(PROFESSION_CAPABILITY_KEY, capability)
