/**
 * Mobile API Client
 * Handles all API communication for mobile app
 */

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

export interface ApiConfig {
  baseUrl: string
  timeout?: number
  retryAttempts?: number
  retryDelay?: number
}

class MobileApiClient {
  private baseUrl: string
  private accessToken: string | null = null
  private refreshToken: string | null = null
  private timeout: number
  private retryAttempts: number
  private retryDelay: number

  constructor(config: ApiConfig) {
    this.baseUrl = config.baseUrl
    this.timeout = config.timeout || 30000
    this.retryAttempts = config.retryAttempts || 3
    this.retryDelay = config.retryDelay || 1000
  }

  /**
   * Set authentication tokens
   */
  setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken
    this.refreshToken = refreshToken
  }

  /**
   * Clear authentication tokens
   */
  clearTokens() {
    this.accessToken = null
    this.refreshToken = null
  }

  /**
   * Make authenticated API request with retry logic
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    // Add authorization header if token available
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`
    }

    let lastError: Error | null = null

    // Retry logic
    for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), this.timeout)

        const response = await fetch(url, {
          ...options,
          headers,
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        // Handle 401 - try to refresh token
        if (response.status === 401 && this.refreshToken && attempt === 0) {
          const refreshed = await this.refreshAccessToken()
          if (refreshed) {
            // Retry with new token
            if (this.accessToken) {
              headers['Authorization'] = `Bearer ${this.accessToken}`
            }
            continue
          }
        }

        const data = await response.json()

        if (!response.ok) {
          return {
            success: false,
            error: {
              code: data.error?.code || 'API_ERROR',
              message: data.error?.message || 'Request failed',
              details: data.error?.details,
            },
            requestId: data.requestId,
          }
        }

        return {
          success: true,
          data: data.data || data,
          requestId: data.requestId,
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        
        // Don't retry on abort or if it's the last attempt
        if (error instanceof Error && error.name === 'AbortError') {
          break
        }
        
        if (attempt < this.retryAttempts - 1) {
          await this.delay(this.retryDelay * (attempt + 1))
        }
      }
    }

    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: lastError?.message || 'Network request failed',
      },
    }
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) {
      return false
    }

    try {
      const response = await this.request<{
        access_token: string
        expires_in: number
      }>('/api/mobile/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({
          refresh_token: this.refreshToken,
        }),
      })

      if (response.success && response.data) {
        this.accessToken = response.data.access_token
        return true
      }
    } catch (error) {
      console.error('Token refresh failed:', error)
    }

    return false
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // ============================================================================
  // Authentication Methods
  // ============================================================================

  /**
   * Login with OAuth code
   */
  async login(code: string, redirectUri: string): Promise<ApiResponse<AuthTokens>> {
    return this.request<AuthTokens>('/api/mobile/auth/login', {
      method: 'POST',
      body: JSON.stringify({ code, redirectUri }),
    })
  }

  /**
   * Get user profile
   */
  async getProfile(): Promise<ApiResponse<{ user: any }>> {
    return this.request('/api/mobile/user/profile')
  }

  // ============================================================================
  // Chat Methods
  // ============================================================================

  /**
   * Send chat message
   */
  async sendChatMessage(
    message: string,
    conversationId?: string,
    mode?: string
  ): Promise<ApiResponse<any>> {
    return this.request('/api/mobile/chat/send', {
      method: 'POST',
      body: JSON.stringify({
        message,
        conversationId,
        mode,
      }),
    })
  }

  // ============================================================================
  // Agents Methods
  // ============================================================================

  /**
   * Get list of available agents
   */
  async getAgents(): Promise<ApiResponse<{ agents: any[]; count: number }>> {
    return this.request('/api/mobile/agents/list')
  }
}

// Export singleton instance
export const apiClient = new MobileApiClient({
  baseUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
})

export default MobileApiClient
