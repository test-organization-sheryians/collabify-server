# server/Dockerfile
FROM oven/bun:1.2-alpine AS base
WORKDIR /app

# Install dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma client
RUN bunx prisma generate

# Install curl for health checks inside the container
RUN apk add --no-cache curl

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Run migrations then start server
CMD ["sh", "-c", "bunx prisma migrate deploy && bun run src/app/server.ts"]
