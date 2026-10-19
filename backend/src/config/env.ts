import { z } from 'zod'

/**
 * Runtime env validation. Fails fast on a misconfigured deployment instead
 * of letting the server boot with undefined DATABASE_URL / JWT_SECRET.
 * Dev defaults keep `npm run dev` working with docker-compose only.
 *
 * Boolean-ish variables are parsed from the literal strings 'true'/'false'
 * and transformed explicitly: `z.coerce.boolean()` is forbidden here because
 * `Boolean('false') === true`, which would silently force Secure cookies on.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z
    .string()
    .url()
    .default('postgresql://respect:respect@localhost:5432/respect_city'),
  JWT_SECRET: z
    .string()
    .min(16)
    .default('dev-secret-change-me-please-32chars'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  /** Session cookie `Secure` flag; defaults to production-only when absent. */
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
});

type ParsedEnv = z.infer<typeof envSchema>;

/**
 * Public env shape: `COOKIE_SECURE` is always a resolved boolean (default
 * `NODE_ENV === 'production'`), never the raw env string.
 */
export type Env = Omit<ParsedEnv, 'COOKIE_SECURE'> & { COOKIE_SECURE: boolean };

/** Parse process.env (test overrides merged for isolated suites). */
export function loadEnv(overrides: Partial<Env> = {}): Env {
  const parsed = envSchema.parse({ ...process.env, ...overrides });
  return {
    ...parsed,
    COOKIE_SECURE:
      parsed.COOKIE_SECURE ?? (parsed.NODE_ENV === 'production'),
  };
}