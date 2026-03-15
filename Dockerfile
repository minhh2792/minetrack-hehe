FROM oven/bun:1.3 AS builder

WORKDIR /app

# Copy package files
COPY package.json ./
COPY frontend/package.json frontend/

# Install all dependencies
RUN cd /app && npm install
RUN cd /app/frontend && npm install

# Copy source files
COPY . .

# Build frontend
RUN cd frontend && npm run build

# Production image
FROM oven/bun:1.3-slim

ARG TINI_VER="v0.19.0"
ADD https://github.com/krallin/tini/releases/download/$TINI_VER/tini /sbin/tini
RUN chmod +x /sbin/tini

WORKDIR /app

# Copy built artifacts and backend source
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/frontend/dist ./frontend/dist
COPY --from=builder /app/src ./src
COPY --from=builder /app/servers.json ./
COPY --from=builder /app/minecraft_versions.json ./
COPY --from=builder /app/package.json ./
COPY --from=builder /app/tsconfig.json ./

# Run as non-root
RUN addgroup --gid 10043 --system minetrack \
 && adduser --uid 10042 --system --ingroup minetrack --no-create-home --gecos "" minetrack \
 && chown -R minetrack:minetrack /app
USER minetrack

EXPOSE 8080

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["bun", "run", "src/index.ts"]
