/**
 * Validates environment variables at startup.
 * The app will throw with a clear message if any required var is missing.
 */
export function validateEnv(config: Record<string, unknown>) {
  const required = ['DATABASE_URL', 'BETTER_AUTH_URL'] as const;

  for (const key of required) {
    if (!config[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  // Prevent wildcard CORS in production — it disables all origin protection
  if (config['NODE_ENV'] === 'production') {
    const origins = String(config['CORS_ORIGINS'] ?? '');
    if (origins.includes('*')) {
      throw new Error(
        'CORS_ORIGINS must not contain "*" in production. Set explicit allowed origins.',
      );
    }
  }

  return config;
}
