import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

// Prisma 7: schema.prisma keeps only the provider; the connection URL for
// Migrate/Studio lives here. Runtime uses a driver adapter (see shared/db).
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});