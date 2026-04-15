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

  return config;
}
