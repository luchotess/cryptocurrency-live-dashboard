import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  HealthCheck,
  TypeOrmHealthIndicator,
  HealthCheckResult,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { FinnhubClient } from '../finnhub/finnhub-client.service';
import { QuotesOrchestratorService } from '../stream/quotes-orchestrator.service';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private finnhubClient: FinnhubClient,
    private orchestrator: QuotesOrchestratorService,
  ) {}

  @Get('live')
  @HealthCheck()
  checkLiveness(): Promise<HealthCheckResult> {
    // Liveness check - just verify the app is running
    return this.health.check([() => ({ app: { status: 'up' } })]);
  }

  @Get('ready')
  @HealthCheck()
  checkReadiness(): Promise<HealthCheckResult> {
    // Readiness check - verify all dependencies are ready
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.checkFinnhubStatus(),
      () => this.checkSystemStatus(),
    ]);
  }

  private checkFinnhubStatus(): HealthIndicatorResult {
    const status = this.finnhubClient.getStatus();
    const isHealthy = status === 'connected' || status === 'connecting';

    return {
      finnhub: {
        status: isHealthy ? 'up' : 'down',
        details: {
          connectionStatus: status,
          connected: this.finnhubClient.isConnected(),
        },
      },
    };
  }

  private checkSystemStatus(): HealthIndicatorResult {
    const systemStatus = this.orchestrator.getSystemStatus();

    return {
      system: {
        status: 'up',
        details: systemStatus,
      },
    };
  }
}
