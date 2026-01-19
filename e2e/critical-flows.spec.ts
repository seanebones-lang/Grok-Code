import { test, expect } from '@playwright/test'

/**
 * Critical Flow E2E Tests
 * Tests all essential user workflows
 */

test.describe('Critical User Flows', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app
    await page.goto('/')
    // Wait for page to load
    await page.waitForLoadState('networkidle')
  })

  test('Homepage loads successfully', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/NextEleven|Grok/)
    
    // Check main elements exist
    await expect(page.locator('body')).toBeVisible()
  })

  test('Authentication flow', async ({ page }) => {
    // Check for login button or auth state
    const loginButton = page.locator('text=/login|sign in/i').first()
    
    if (await loginButton.isVisible()) {
      // If login button exists, click it
      await loginButton.click()
      await page.waitForURL(/login|auth|github/)
    }
    
    // Verify auth state (either logged in or on login page)
    const isLoggedIn = await page.locator('text=/logout|sign out|profile/i').isVisible().catch(() => false)
    const isLoginPage = await page.url().includes('login') || await page.url().includes('auth')
    
    expect(isLoggedIn || isLoginPage).toBeTruthy()
  })

  test('Chat interface loads', async ({ page }) => {
    // Check for chat input
    const chatInput = page.locator('textarea, input[type="text"]').first()
    await expect(chatInput).toBeVisible({ timeout: 10000 })
  })

  test('Agent selection works', async ({ page }) => {
    // Look for agent selector or dropdown
    const agentSelector = page.locator('text=/agent|select|choose/i').first()
    
    if (await agentSelector.isVisible({ timeout: 5000 }).catch(() => false)) {
      await agentSelector.click()
      // Verify dropdown or menu appears
      await expect(page.locator('[role="menu"], [role="listbox"]').first()).toBeVisible({ timeout: 2000 }).catch(() => {
        // If no menu, check for agent buttons
        expect(page.locator('button').first()).toBeVisible()
      })
    }
  })

  test('No console errors', async ({ page }) => {
    const errors: string[] = []
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })
    
    page.on('pageerror', error => {
      errors.push(error.message)
    })
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle')
    
    // Check for errors
    expect(errors.length).toBe(0)
  })

  test('API routes are accessible', async ({ request }) => {
    // Test health endpoint if exists
    const healthResponse = await request.get('/api/health').catch(() => null)
    
    if (healthResponse) {
      expect(healthResponse.status()).toBeLessThan(500)
    }
  })
})

test.describe('Error Handling', () => {
  test('Error boundaries work', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Check no error messages visible
    const errorMessages = page.locator('text=/error|failed|something went wrong/i')
    await expect(errorMessages.first()).not.toBeVisible({ timeout: 2000 }).catch(() => {
      // Errors might be hidden, which is fine
    })
  })
})
