import { Body, Controller, Get, Header, Param, Patch } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { PublicRoute } from '../../common/decorators/public-route.decorator'
import { UpdatePatientPortalIntakeDto } from './dto/patient-portal.dto'
import { PatientsService } from './patients.service'

@PublicRoute()
@Controller('patient-portal')
export class PatientPortalController {
  constructor(private svc: PatientsService) {}

  @Get(':token')
  @Header('Cache-Control', 'private, no-store')
  @Throttle({ short: { limit: 30, ttl: 60 * 1000 } })
  getPortal(@Param('token') token: string) {
    return this.svc.getPortal(token)
  }

  @Patch(':token/intake')
  @Header('Cache-Control', 'private, no-store')
  @Throttle({ short: { limit: 8, ttl: 60 * 1000 } })
  updateIntake(@Param('token') token: string, @Body() dto: UpdatePatientPortalIntakeDto) {
    return this.svc.updatePortalIntake(token, dto)
  }
}
