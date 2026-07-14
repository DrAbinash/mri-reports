import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  try {
    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['error'] : [],
    });
  } catch (error) {
    console.error('[db] Failed to initialize PrismaClient:', error);
    // Return a proxy that throws clear errors
    return new Proxy({} as PrismaClient, {
      get(_target, prop) {
        return () => {
          throw new Error(`Database not available: PrismaClient failed to initialize. Check DATABASE_URL and Prisma engine.`);
        };
      }
    });
  }
}

export const db =
  globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db