import { z } from 'zod'

/**
 * Runtime env validation. Fails fast on a misconfigured deployment instead
 * of letting the server boot with undefined DATABASE_URL / JWT_SECRET.
 * Dev defaults keep `npm run dev` working with docker-compose only.
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
});

export type Env = z.infer<typeof envSchema>;

/** Parse process.env (test overrides merged for isolated suites). */
export function loadEnv(overrides: Partial<Env> = {}): Env {
  return envSchema.parse({ ...process.env, ...overrides });
}