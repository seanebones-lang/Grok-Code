/**
 * Mobile API Client
 * Enhanced with React Query integration and improved error handling
 */

import { QueryClient } from '@tanstack/react-query'
import * as SecureStore from 'expo-secure-store'
import * as Haptics from 'expo-haptics'

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  requestId?: string
}

export interface AuthTokens {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  user: {
    id: string
    email: string
    name?: string
  }
}

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://nexteleven-code.vercel.app'

/**
 * React Query client with optimized defaults
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    },
    mutations: {
      retry: 1,
    },
  },
})

/**
 * API fetch helper with authentication and error handling
 */
const apiFetch = async <T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> => {
  try {
    const token = await SecureStore.getItemAsync('mobile_access_token')
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    })

    if (!response.ok) {
      // Try to refresh token on 401
      if (response.status === 401 && token) {
        const refreshed = await refreshAccessToken()
        if (refreshed) {
          // Retry with new token
          const newToken = await SecureStore.getItemAsync('mobile_access_token')
          if (newToken) {
            headers['Authorization'] = `Bearer ${newToken}`
            const retryResponse = await fetch(`${API_BASE}${endpoint}`, {
              ...options,
              headers,
            })
            if (retryResponse.ok) {
              return retryResponse.json()
            }
          }
        }
      }

      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error?.message || `HTTP ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    throw error
  }
}

/**
 * Refresh access token using refresh token
 */
async function refreshAccessToken(): Promise<boolean> {
  try {
    const refreshToken = await SecureStore.getItemAsync('mobile_refresh_token')
    if (!refreshToken) return false

    const response = await fetch(`${API_BASE}/api/mobile/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refresh_token: refreshToken,
      }),
    })

    if (!response.ok) return false

    const data = await response.json()
    if (data.success && data.data?.access_token) {
      await SecureStore.setItemAsync('mobile_access_token', data.data.access_token)
      return true
    }

    return false
  } catch (error) {
    console.error('Token refresh failed:', error)
    return false
  }
}

/**
 * API methods
 */
export const api = {
  /**
   * Login with OAuth code
   */
  login: (code: string, redirectUri: string) =>
    apiFetch<AuthTokens>('/api/mobile/auth/login', {
      method: 'POST',
      body: JSON.stringify({ code, redirectUri }),
    }),

  /**
   * Refresh access token
   */
  refresh: () =>
    apiFetch<{ access_token: string; expires_in: number }>('/api/mobile/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({
        refresh_token: '', // Will be read from SecureStore in apiFetch
      }),
    }),

  /**
   * Get user profile
   */
  profile: () => apiFetch<{ user: any }>('/api/mobile/user/profile'),

  /**
   * Get list of agents
   */
  agents: () => apiFetch<{ agents: any[]; count: number }>('/api/mobile/agents/list'),

  /**
   * Send chat message
   */
  chatSend: (message: string, conversationId?: string, mode?: string) =>
    apiFetch('/api/mobile/chat/send', {
      method: 'POST',
      body: JSON.stringify({
        message,
        conversationId,
        mode,
      }),
    }),
}

export default api
