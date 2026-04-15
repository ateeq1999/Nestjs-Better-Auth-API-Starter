/**
 * OpenTelemetry tracing bootstrap (OB3).
 *
 * This file MUST be imported/required before any other module so the SDK
 * can instrument Node.js internals (http, pg, ioredis, etc.) at startup.
 *
 * Usage in main.ts — add at the very top:
 *   import './tracing';
 *
 * Or via NODE_OPTIONS before launching the process:
 *   NODE_OPTIONS="--require ./dist/tracing" node dist/main
 *
 * Required env vars:
 *   OTEL_ENABLED=true               — set to enable tracing (disabled by default)
 *   OTEL_EXPORTER_OTLP_ENDPOINT     — e.g. http://localhost:4318 (Tempo HTTP)
 *   OTEL_SERVICE_NAME               — e.g. nest-better-auth
 */

if (process.env.OTEL_ENABLED === 'true') {
  // Dynamic require keeps this off the import graph when OTEL_ENABLED is unset,
  // so the heavy SDK packages don't slow startup in development.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { NodeSDK } = require('@opentelemetry/sdk-node') as typeof import('@opentelemetry/sdk-node');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node') as typeof import('@opentelemetry/auto-instrumentations-node');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http') as typeof import('@opentelemetry/exporter-trace-otlp-http');

  const sdk = new NodeSDK({
    serviceName: process.env.OTEL_SERVICE_NAME ?? 'nest-better-auth',
    traceExporter: new OTLPTraceExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT
        ? `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces`
        : 'http://localhost:4318/v1/traces',
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        // Disable noisy file-system instrumentation
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
    ],
  });

  sdk.start();
  console.log(`[OTel] Tracing enabled → ${process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318'}`);

  process.on('SIGTERM', () => {
    sdk.shutdown().catch(console.error);
  });
}
