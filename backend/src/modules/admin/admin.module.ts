import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { User } from '../auth/entities/user.entity'
import { Subscription } from '../billing/entities/subscription.entity'
import { AdminService } from './admin.service'
import { AdminController } from './admin.controller'

@Module({
  imports: [TypeOrmModule.forFeature([User, Subscription])],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
