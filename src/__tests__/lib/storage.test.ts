import {
  getStorageItem,
  setStorageItem,
  removeStorageItem,
  clearStorage,
  getStorageInfo,
  setStorageItemWithExpiry,
  getStorageItemWithExpiry,
} from '@/lib/storage'

describe('Storage utilities', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    jest.clearAllMocks()
  })

  describe('getStorageItem', () => {
    it('should return default value when item does not exist', () => {
      const result = getStorageItem('nonexistent', 'default')
      expect(result).toBe('default')
    })

    it('should return stored value when item exists', () => {
      localStorage.setItem('grokcode_test', JSON.stringify('stored value'))
      const result = getStorageItem('test', 'default')
      expect(result).toBe('stored value')
    })

    it('should handle complex objects', () => {
      const obj = { foo: 'bar', nested: { baz: 123 } }
      localStorage.setItem('grokcode_complex', JSON.stringify(obj))
      const result = getStorageItem('complex', {})
      expect(result).toEqual(obj)
    })

    it('should return default value on parse error', () => {
      localStorage.setItem('grokcode_invalid', 'not valid json')
      const result = getStorageItem('invalid', 'default')
      expect(result).toBe('default')
    })
  })

  describe('setStorageItem', () => {
    it('should store item correctly', () => {
      const success = setStorageItem('test', 'value')
      expect(success).toBe(true)
      expect(localStorage.getItem('grokcode_test')).toBe('"value"')
    })

    it('should store complex objects', () => {
      const obj = { foo: 'bar', arr: [1, 2, 3] }
      const success = setStorageItem('complex', obj)
      expect(success).toBe(true)
      expect(JSON.parse(localStorage.getItem('grokcode_complex') || '')).toEqual(obj)
    })
  })

  describe('removeStorageItem', () => {
    it('should remove item correctly', () => {
      localStorage.setItem('grokcode_test', '"value"')
      const success = removeStorageItem('test')
      expect(success).toBe(true)
      expect(localStorage.getItem('grokcode_test')).toBeNull()
    })

    it('should return true even if item does not exist', () => {
      const success = removeStorageItem('nonexistent')
      expect(success).toBe(true)
    })
  })

  describe('clearStorage', () => {
    it('should clear all grokcode items', () => {
      localStorage.setItem('grokcode_item1', '"value1"')
      localStorage.setItem('grokcode_item2', '"value2"')
      localStorage.setItem('other_item', '"value3"')
      
      const success = clearStorage()
      
      expect(success).toBe(true)
      expect(localStorage.getItem('grokcode_item1')).toBeNull()
      expect(localStorage.getItem('grokcode_item2')).toBeNull()
      expect(localStorage.getItem('other_item')).toBe('"value3"')
    })
  })

  describe('getStorageInfo', () => {
    it('should return storage usage info', () => {
      localStorage.setItem('grokcode_test', '"some value"')
      const info = getStorageInfo()
      
      expect(info).toHaveProperty('used')
      expect(info).toHaveProperty('available')
      expect(info).toHaveProperty('percentage')
      expect(info.used).toBeGreaterThan(0)
    })
  })

  describe('setStorageItemWithExpiry', () => {
    it('should store item with expiry', () => {
      const success = setStorageItemWithExpiry('test', 'value', 60000)
      expect(success).toBe(true)
      
      const stored = JSON.parse(localStorage.getItem('grokcode_test') || '{}')
      expect(stored.value).toBe('value')
      expect(stored._timestamp).toBeDefined()
      expect(stored._expiry).toBeDefined()
    })
  })

  describe('getStorageItemWithExpiry', () => {
    it('should return value if not expired', () => {
      const futureExpiry = Date.now() + 60000
      localStorage.setItem('grokcode_test', JSON.stringify({
        value: 'stored',
        _expiry: futureExpiry,
      }))
      
      const result = getStorageItemWithExpiry('test', 'default')
      expect(result).toBe('stored')
    })

    it('should return default if expired', () => {
      const pastExpiry = Date.now() - 60000
      localStorage.setItem('grokcode_test', JSON.stringify({
        value: 'stored',
        _expiry: pastExpiry,
      }))
      
      const result = getStorageItemWithExpiry('test', 'default')
      expect(result).toBe('default')
    })

    it('should remove expired item', () => {
      const pastExpiry = Date.now() - 60000
      localStorage.setItem('grokcode_test', JSON.stringify({
        value: 'stored',
        _expiry: pastExpiry,
      }))
      
      getStorageItemWithExpiry('test', 'default')
      expect(localStorage.getItem('grokcode_test')).toBeNull()
    })
  })
})
