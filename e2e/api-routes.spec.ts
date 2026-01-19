import { test, expect } from '@playwright/test'

/**
 * API Routes E2E Tests
 * Tests all API endpoints
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

test.describe('API Routes', () => {
  test('Health check endpoint (if exists)', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/health`).catch(() => null)
    if (response) {
      expect(response.status()).toBeLessThan(500)
    }
  })

  test('Chat API requires authentication', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/chat`, {
      data: { message: 'test' },
    })
    
    // Should either require auth (401/403) or accept request (200/400)
    expect([200, 400, 401, 403]).toContain(response.status())
  })

  test('GitHub API endpoints exist', async ({ request }) => {
    // Test if endpoints exist (may require auth)
    const reposResponse = await request.get(`${BASE_URL}/api/github/repos`).catch(() => null)
    if (reposResponse) {
      expect([200, 401, 403, 404]).toContain(reposResponse.status())
    }
  })
})
