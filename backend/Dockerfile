# syntax=docker/dockerfile:1

# --- Build: deps + Prisma client + compiled JS -------------------------------
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# prisma.config.ts evaluates env('DATABASE_URL') at load time and throws when
# unset. `generate` does not open a connection, so a placeholder is enough.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
RUN npx prisma generate && npm run build

# --- Runtime: migrations + server --------------------------------------------
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/tsconfig.json ./tsconfig.json

EXPOSE 3000

# Apply pending migrations, then boot. DATABASE_URL comes from Compose.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
