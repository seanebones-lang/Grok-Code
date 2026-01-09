/**
 * Type-safe localStorage utilities with error handling
 * Handles SSR, quota exceeded, and JSON parsing errors
 */

const STORAGE_PREFIX = 'nexteleven_'

/**
 * Check if localStorage is available
 */
function isLocalStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false
  
  try {
    const testKey = '__storage_test__'
    window.localStorage.setItem(testKey, testKey)
    window.localStorage.removeItem(testKey)
    return true
  } catch {
    return false
  }
}

/**
 * Get an item from localStorage with type safety
 */
export function getStorageItem<T>(key: string, defaultValue: T): T {
  if (!isLocalStorageAvailable()) return defaultValue
  
  try {
    const prefixedKey = STORAGE_PREFIX + key
    const item = window.localStorage.getItem(prefixedKey)
    
    if (item === null) return defaultValue
    
    return JSON.parse(item) as T
  } catch (error) {
    console.warn(`[Storage] Failed to get item "${key}":`, error)
    return defaultValue
  }
}

/**
 * Set an item in localStorage
 */
export function setStorageItem<T>(key: string, value: T): boolean {
  if (!isLocalStorageAvailable()) return false
  
  try {
    const prefixedKey = STORAGE_PREFIX + key
    const serialized = JSON.stringify(value)
    window.localStorage.setItem(prefixedKey, serialized)
    return true
  } catch (error) {
    // Handle quota exceeded
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.warn(`[Storage] Quota exceeded when setting "${key}"`)
      // Try to clear old data
      clearOldStorageItems()
      // Retry once
      try {
        const prefixedKey = STORAGE_PREFIX + key
        window.localStorage.setItem(prefixedKey, JSON.stringify(value))
        return true
      } catch {
        return false
      }
    }
    console.warn(`[Storage] Failed to set item "${key}":`, error)
    return false
  }
}

/**
 * Remove an item from localStorage
 */
export function removeStorageItem(key: string): boolean {
  if (!isLocalStorageAvailable()) return false
  
  try {
    const prefixedKey = STORAGE_PREFIX + key
    window.localStorage.removeItem(prefixedKey)
    return true
  } catch (error) {
    console.warn(`[Storage] Failed to remove item "${key}":`, error)
    return false
  }
}

/**
 * Clear all NextEleven Code items from localStorage
 */
export function clearStorage(): boolean {
  if (!isLocalStorageAvailable()) return false
  
  try {
    const keysToRemove: string[] = []
    
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i)
      if (key?.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(key)
      }
    }
    
    keysToRemove.forEach(key => window.localStorage.removeItem(key))
    return true
  } catch (error) {
    console.warn('[Storage] Failed to clear storage:', error)
    return false
  }
}

/**
 * Clear old storage items to free up space
 */
function clearOldStorageItems(): void {
  if (!isLocalStorageAvailable()) return
  
  try {
    // Remove items older than 7 days
    const maxAge = 7 * 24 * 60 * 60 * 1000
    const now = Date.now()
    
    for (let i = window.localStorage.length - 1; i >= 0; i--) {
      const key = window.localStorage.key(i)
      if (!key?.startsWith(STORAGE_PREFIX)) continue
      
      try {
        const item = window.localStorage.getItem(key)
        if (!item) continue
        
        const parsed = JSON.parse(item)
        if (parsed._timestamp && now - parsed._timestamp > maxAge) {
          window.localStorage.removeItem(key)
        }
      } catch {
        // Remove corrupted items
        window.localStorage.removeItem(key)
      }
    }
  } catch (error) {
    console.warn('[Storage] Failed to clear old items:', error)
  }
}

/**
 * Get storage usage info
 */
export function getStorageInfo(): { used: number; available: number; percentage: number } {
  if (!isLocalStorageAvailable()) {
    return { used: 0, available: 0, percentage: 0 }
  }
  
  try {
    let used = 0
    
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i)
      if (key) {
        const value = window.localStorage.getItem(key)
        if (value) {
          used += key.length + value.length
        }
      }
    }
    
    // Estimate available space (typically 5-10MB)
    const available = 5 * 1024 * 1024 // 5MB estimate
    const percentage = (used / available) * 100
    
    return { used, available, percentage }
  } catch {
    return { used: 0, available: 0, percentage: 0 }
  }
}

/**
 * Create a storage item with timestamp for expiration
 */
export function setStorageItemWithExpiry<T>(
  key: string, 
  value: T, 
  expiryMs: number
): boolean {
  const item = {
    value,
    _timestamp: Date.now(),
    _expiry: Date.now() + expiryMs,
  }
  return setStorageItem(key, item)
}

/**
 * Get a storage item with expiry check
 */
export function getStorageItemWithExpiry<T>(key: string, defaultValue: T): T {
  const item = getStorageItem<{ value: T; _expiry: number } | null>(key, null)
  
  if (!item) return defaultValue
  
  if (Date.now() > item._expiry) {
    removeStorageItem(key)
    return defaultValue
  }
  
  return item.value
}
