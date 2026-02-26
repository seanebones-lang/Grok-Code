import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Prisma 7 requires explicit DATABASE_URL or connection config
// Use lazy initialization to avoid build-time issues
function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL
  
  if (!databaseUrl) {
    // Only throw at runtime, not during build
    // Build-time will be handled by making API routes dynamic
    throw new Error(
      'DATABASE_URL environment variable is required but not set. ' +
      'Please configure it in your environment variables.'
    )
  }
  
  return new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  })
}

// Lazy initialization - only create when actually accessed (at runtime, not build time)
let _prisma: PrismaClient | undefined = undefined

function getPrisma(): PrismaClient {
  if (_prisma) {
    return _prisma
  }
  
  if (globalForPrisma.prisma) {
    _prisma = globalForPrisma.prisma
    return _prisma
  }
  
  _prisma = createPrismaClient()
  
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = _prisma
  }
  
  return _prisma
}

// Export a getter that initializes on first access (lazy loading)
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrisma()
    const value = (client as any)[prop]
    return typeof value === 'function' ? value.bind(client) : value
  }
})
