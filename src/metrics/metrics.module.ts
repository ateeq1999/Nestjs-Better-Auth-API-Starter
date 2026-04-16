import { Module } from '@nestjs/common';
import {
  PrometheusModule,
  makeCounterProvider,
  makeHistogramProvider,
} from '@willsoto/nestjs-prometheus';
import { CustomMetricsController } from './metrics.controller';

/**
 * Exposes Prometheus metrics at GET /metrics (OB1).
 *
 * Custom metrics (OB2):
 *   auth_events_total{action}          — counter per auth action (sign_in, sign_up, etc.)
 *   http_request_duration_seconds      — histogram of request duration by method + route + status
 *
 * Scrape config for Prometheus (observability/prometheus.yml):
 *   - job_name: 'nest-better-auth'
 *     static_configs:
 *       - targets: ['api:5555']
 *     metrics_path: /metrics
 */
@Module({
  imports: [
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: { enabled: true }, // process + Node.js runtime metrics
      controller: CustomMetricsController,
    }),
  ],
  providers: [
    // Counter: incremented on every auth event (injected into controllers via AuditService hook)
    makeCounterProvider({
      name: 'auth_events_total',
      help: 'Total number of authentication events',
      labelNames: ['action'],
    }),
    // Histogram: HTTP request duration (populated by LoggingInterceptor)
    makeHistogramProvider({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
    }),
  ],
  exports: ['PROM_METRIC_AUTH_EVENTS_TOTAL', 'PROM_METRIC_HTTP_REQUEST_DURATION_SECONDS'],
})
export class MetricsModule {}
