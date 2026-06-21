import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Testimonial } from './entities/testimonial.entity'
import { User } from '../auth/entities/user.entity'
import { Patient } from '../patients/entities/patient.entity'
import { Session } from '../sessions/entities/session.entity'
import { TestimonialService } from './testimonial.service'
import { TestimonialController } from './testimonial.controller'

@Module({
  imports: [TypeOrmModule.forFeature([Testimonial, User, Patient, Session])],
  controllers: [TestimonialController],
  providers: [TestimonialService],
})
export class TestimonialModule {}
