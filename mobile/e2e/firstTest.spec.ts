/**
 * E2E Tests for Grok Swarm Mobile
 * Login flow and chat functionality
 */

import { device, expect, element, by, waitFor } from './setup'

describe('Login Flow', () => {
  beforeEach(async () => {
    await device.reloadReactNative()
  })

  it('should display login screen', async () => {
    await expect(element(by.text('GitHub Login'))).toBeVisible()
    await expect(element(by.id('login-button'))).toBeVisible()
  })

  it('should navigate to home after login', async () => {
    // Note: Actual OAuth flow requires manual interaction or mocking
    // This test assumes successful login
    await element(by.id('login-button')).tap()
    
    // Wait for OAuth redirect (or mock it)
    await waitFor(element(by.text('Agents')))
      .toBeVisible()
      .withTimeout(10000)
    
    await expect(element(by.text('Agents'))).toBeVisible()
  })
})

describe('Chat Flow', () => {
  beforeEach(async () => {
    await device.reloadReactNative()
    // Assume logged in state (or add login steps)
  })

  it('should navigate to chat screen', async () => {
    await element(by.text('Chat')).tap()
    await expect(element(by.id('chat-input'))).toBeVisible()
  })

  it('should send message and receive response', async () => {
    await element(by.text('Chat')).tap()
    
    const input = element(by.id('chat-input'))
    await input.typeText('Hi, test message')
    
    await element(by.id('send-button')).tap()
    
    // Wait for assistant response
    await waitFor(element(by.text('assistant')))
      .toBeVisible()
      .withTimeout(30000)
    
    await expect(element(by.text('assistant'))).toBeVisible()
  })

  it('should disable send button when input is empty', async () => {
    await element(by.text('Chat')).tap()
    
    const sendButton = element(by.id('send-button'))
    await expect(sendButton).toBeNotEnabled()
  })
})

describe('Agents List', () => {
  beforeEach(async () => {
    await device.reloadReactNative()
    // Assume logged in state
  })

  it('should display agents list', async () => {
    await waitFor(element(by.id('agents-list')))
      .toBeVisible()
      .withTimeout(5000)
    
    await expect(element(by.id('agents-list'))).toBeVisible()
  })

  it('should allow selecting an agent', async () => {
    await waitFor(element(by.id('agents-list')))
      .toBeVisible()
      .withTimeout(5000)
    
    // Tap first agent (adjust selector as needed)
    await element(by.id('agent-item-0')).tap()
    
    // Should navigate or show agent details
    await expect(element(by.id('agent-details'))).toBeVisible()
  })
})
