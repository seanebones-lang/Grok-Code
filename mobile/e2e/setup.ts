/**
 * Detox E2E Test Setup
 */

import { device, expect as detoxExpect, element, by, waitFor } from 'detox'

beforeAll(async () => {
  await device.launchApp()
})

beforeEach(async () => {
  await device.reloadReactNative()
})

afterAll(async () => {
  // Cleanup if needed
})

export { device, detoxExpect as expect, element, by, waitFor }
