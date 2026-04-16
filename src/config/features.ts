import { featureDefaults, type FeatureKey } from './features.config';

/**
 * Resolves a feature flag: env var wins over the default in features.config.ts.
 *
 * Env var name: FEATURE_<SCREAMING_SNAKE_CASE>
 *   twoFactor   → FEATURE_TWO_FACTOR
 *   emailQueue  → FEATURE_EMAIL_QUEUE
 *   logShipping → FEATURE_LOG_SHIPPING
 */
function toEnvKey(key: FeatureKey): string {
  return `FEATURE_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`;
}

function resolve(key: FeatureKey): boolean {
  const val = process.env[toEnvKey(key)];
  if (val === undefined) return featureDefaults[key];
  return val !== 'false' && val !== '0' && val !== '';
}

/**
 * Resolved feature flags for the current process.
 *
 * Usage:
 *   import { features } from '@config/features';
 *   if (features.swagger) { ... }
 *
 * Evaluated once at module load — reading process.env at startup, not per-request.
 */
export const features: Record<FeatureKey, boolean> = Object.fromEntries(
  (Object.keys(featureDefaults) as FeatureKey[]).map((k) => [k, resolve(k)]),
) as Record<FeatureKey, boolean>;

/** Pretty-print all resolved flags to stdout (useful at server startup). */
export function logFeatures(): void {
  const on  = (Object.keys(features) as FeatureKey[]).filter((k) => features[k]);
  const off = (Object.keys(features) as FeatureKey[]).filter((k) => !features[k]);
  console.log('Features ON :', on.join(', ')  || '(none)');
  console.log('Features OFF:', off.join(', ') || '(none)');
}
