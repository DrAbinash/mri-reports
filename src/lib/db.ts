import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
db.$executeRawUnsafe("PRAGMA journal_mode=WAL;").catch(() => {});
db.$executeRawUnsafe("PRAGMA synchronous=NORMAL;").catch(() => {});
db.$executeRawUnsafe("PRAGMA busy_timeout=30000;").catch(() => {});
