// Entry point standalone para os jobs de prospecção, pensado para rodar como
// Railway Cron Service (processo sobe, executa UM job, sai) em vez de dentro
// do processo sempre-ativo da API. Ver docs/RAILWAY_CRON_PROSPECTING.md.
//
// Uso: node dist/cron-prospecting.js <job>
// <job> ∈ discover | analyze | metrics | expire | retry | followups

import { webcrypto } from 'crypto'
if (!globalThis.crypto) (globalThis as any).crypto = webcrypto as any

import { NestFactory } from '@nestjs/core'
import { Logger } from '@nestjs/common'
import { AppModule } from './app.module'
import { DiscoverProspectsJob } from './modules/prospecting/jobs/discover-prospects.job'
import { AnalyzePendingProspectsJob } from './modules/prospecting/jobs/analyze-pending-prospects.job'
import { CalculateProspectingMetricsJob } from './modules/prospecting/jobs/calculate-prospecting-metrics.job'
import { ExpireOldProspectsJob } from './modules/prospecting/jobs/expire-old-prospects.job'
import { RetryFailedAnalysesJob } from './modules/prospecting/jobs/retry-failed-analyses.job'
import { SendScheduledFollowupsJob } from './modules/prospecting/jobs/send-scheduled-followups.job'

const JOBS = {
  discover: DiscoverProspectsJob,
  analyze: AnalyzePendingProspectsJob,
  metrics: CalculateProspectingMetricsJob,
  expire: ExpireOldProspectsJob,
  retry: RetryFailedAnalysesJob,
  followups: SendScheduledFollowupsJob,
} as const

type JobName = keyof typeof JOBS

async function main() {
  const logger = new Logger('CronProspecting')
  const jobName = process.argv[2] as JobName | undefined
  const JobClass = jobName ? JOBS[jobName] : undefined

  if (!JobClass) {
    logger.error(`Job desconhecido ou ausente: "${jobName}". Use um de: ${Object.keys(JOBS).join(', ')}`)
    process.exit(1)
  }

  // Watchdog: o processo TEM que sair sozinho logo após rodar o job — é um
  // Railway Cron Service, cobrado pelo tempo que fica de pé. Se algo (pool do
  // Postgres, cliente Redis, listener não fechado por outro módulo do
  // AppModule) travar o graceful shutdown, forçamos a saída de qualquer jeito.
  const watchdog = setTimeout(() => {
    console.error(`[CronProspecting] watchdog: saída forçada após timeout`)
    process.exit(1)
  }, 5 * 60 * 1000)
  watchdog.unref()

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn', 'log'] })
  const job = app.get(JobClass)
  logger.log(`Executando job "${jobName}"...`)
  await job.run()
  logger.log(`Job "${jobName}" concluído. Saindo (sem esperar shutdown gracioso).`)
  // Saída imediata e forçada: o container é efêmero, não precisa de
  // app.close() — esperar por ele é justamente o que estava prendendo o
  // processo vivo (memória sustentada) na primeira versão deste script.
  process.exit(0)
}

main().catch(err => { console.error(err); process.exit(1) })
