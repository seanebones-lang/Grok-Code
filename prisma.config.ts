/**
 * Prisma 7 Configuration
 * Connection URL for migrations
 */

import { defineConfig } from 'prisma'

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL || '',
  },
})
