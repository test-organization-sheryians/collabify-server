FROM oven/bun:alpine

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies (frozen lockfile for speed/consistency)
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma Client (if needed)
RUN bunx prisma generate

# Expose port
EXPOSE 3000

# Start server
CMD ["bun", "run", "src/app/server.ts"]
