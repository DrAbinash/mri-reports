# ---- Build Stage ----
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies with npm (reliable on Synology ARM/x86)
COPY package.json package-lock.json* ./
RUN npm install

# Copy source and generate Prisma client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy rest of the app
COPY . .

# Build Next.js standalone
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- Production Stage ----
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy built output
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy Prisma schema + CLI + engine for runtime migrations
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# Create data directories (runs as root — Synology volumes are root-owned)
RUN mkdir -p /app/data/uploads/organized /app/data/db

# Copy and set up entrypoint
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# NOTE: Running as root for Synology compatibility.
# Synology Docker volumes mount as root — non-root users get Permission denied.

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV DATABASE_URL="file:/app/data/db/mri_reports.db"
ENV UPLOAD_DIR="/app/data/uploads"

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "server.js"]