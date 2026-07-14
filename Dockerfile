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

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built output
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy Prisma schema for runtime migrations
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Create data directories with proper ownership
RUN mkdir -p /app/data/uploads/organized /app/data/db && \
    chown -R nextjs:nodejs /app/data

# Copy and set up entrypoint
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh && \
    chown nextjs:nodejs /app/docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV DATABASE_URL="file:/app/data/db/mri_reports.db"
ENV UPLOAD_DIR="/app/data/uploads"

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "server.js"]