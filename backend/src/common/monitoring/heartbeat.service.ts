import { Injectable, Logger } from '@nestjs/common'

/**
 * Heartbeat opcional (ex.: Better Stack) para jobs críticos. Só ativa se a
 * env var da URL estiver setada — sem configuração, `ping()` é um no-op.
 * Nunca bloqueia nem lança: uma falha de monitoramento não pode interromper
 * a tarefa principal (lembretes, notificações etc). O ping é um GET vazio —
 * nenhum dado de paciente é enviado.
 */
@Injectable()
export class HeartbeatService {
  private readonly logger = new Logger(HeartbeatService.name)

  ping(envVar: string): void {
    const url = process.env[envVar]
    if (!url) return

    fetch(url, { method: 'GET' }).catch((err: unknown) => {
      this.logger.debug(`Heartbeat ${envVar} falhou (ignorado): ${(err as Error)?.message}`)
    })
  }
}
