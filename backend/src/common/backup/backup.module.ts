import { Module } from '@nestjs/common'
import { BackupJob } from './backup.job'

@Module({
  providers: [BackupJob],
})
export class BackupModule {}
