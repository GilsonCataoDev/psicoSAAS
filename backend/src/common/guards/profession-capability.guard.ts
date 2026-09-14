import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { PROFESSION_CAPABILITY_KEY } from '../decorators/require-profession-capability.decorator'
import { ProfessionCapability, hasProfessionCapability } from '../professions'

/** Garante no servidor que uma ferramenta só seja usada pela área habilitada. */
@Injectable()
export class ProfessionCapabilityGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const capability = this.reflector.getAllAndOverride<ProfessionCapability>(
      PROFESSION_CAPABILITY_KEY,
      [context.getHandler(), context.getClass()],
    )
    if (!capability) return true

    const user = context.switchToHttp().getRequest().user
    if (!user) return false
    if (hasProfessionCapability(user?.profession, capability)) return true

    throw new ForbiddenException({
      message: 'Esta ferramenta não está disponível para a profissão desta conta.',
      requiredCapability: capability,
    })
  }
}
