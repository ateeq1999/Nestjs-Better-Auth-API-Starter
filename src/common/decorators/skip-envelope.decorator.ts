import { SetMetadata } from '@nestjs/common';

export const SKIP_ENVELOPE_KEY = 'skipEnvelope';

/**
 * Opt a controller or handler OUT of the global response envelope.
 *
 * Apply to any controller that returns a raw response that must NOT be wrapped —
 * in practice this means every better-auth proxy controller, because the
 * better-auth web/mobile SDKs expect specific top-level field names
 * (e.g. `user`, `session`, `token`) not `{ success, data, meta }`.
 *
 * Usage:
 *   @SkipEnvelope()
 *   @Controller({ version: '1', path: 'api/auth' })
 *   export class IdentityController {}
 */
export const SkipEnvelope = () => SetMetadata(SKIP_ENVELOPE_KEY, true);
