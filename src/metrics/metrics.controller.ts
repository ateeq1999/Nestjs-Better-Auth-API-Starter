import { Controller, VERSION_NEUTRAL } from '@nestjs/common';
import { PrometheusController } from '@willsoto/nestjs-prometheus';
import { SkipEnvelope } from '../common/decorators/skip-envelope.decorator';

/**
 * Replaces the default PrometheusController so we can:
 *   1. Add @SkipEnvelope() — the Prometheus response is plain text; wrapping it in
 *      the JSON envelope causes Fastify to throw "invalid payload type 'object'".
 *   2. Set VERSION_NEUTRAL — /metrics should never be prefixed with /v1/.
 */
@SkipEnvelope()
@Controller({ version: VERSION_NEUTRAL, path: 'metrics' })
export class CustomMetricsController extends PrometheusController {}
