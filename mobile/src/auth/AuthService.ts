/**
 * Mobile Authentication Service
 * Handles OAuth flow, token management, and secure storage
 */

import * as SecureStore from 'expo-secure-store'
import { apiClient } from '../api/client'

const ACCESS_TOKEN_KEY = 'mobile_access_token'
const REFRESH_TOKEN_KEY = 'mobile_refresh_token'
const USER_KEY = 'mobile_user'

export interface User {
  id: string
  email: string
  name?: string
}

export class AuthService {
  private static instance: AuthService
  private currentUser: User | null = null

  private constructor() {}

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService()
    }
    return AuthService.instance
  }

  /**
   * Initialize auth service - load tokens from secure storage
   */
  async initialize(): Promise<void> {
    try {
      const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY)
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY)
      const userJson = await SecureStore.getItemAsync(USER_KEY)

      if (accessToken && refreshToken) {
        apiClient.setTokens(accessToken, refreshToken)
        
        if (userJson) {
          this.currentUser = JSON.parse(userJson)
        }
      }
    } catch (error) {
      console.error('Auth initialization error:', error)
    }
  }

  /**
   * Start OAuth login flow
   */
  async login(code: string, redirectUri: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await apiClient.login(code, redirectUri)

      if (!response.success || !response.data) {
        return {
          success: false,
          error: response.error?.message || 'Login failed',
        }
      }

      // Store tokens securely
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, response.data.access_token)
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, response.data.refresh_token)
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(response.data.user))

      // Set tokens in API client
      apiClient.setTokens(response.data.access_token, response.data.refresh_token)
      this.currentUser = response.data.user

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
      }
    }
  }

  /**
   * Logout - clear tokens and user data
   */
  async logout(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY)
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY)
      await SecureStore.deleteItemAsync(USER_KEY)

      apiClient.clearTokens()
      this.currentUser = null
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.currentUser !== null
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.currentUser
  }

  /**
   * Get OAuth login URL
   */
  getOAuthUrl(): string {
    const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'
    const clientId = process.env.EXPO_PUBLIC_GITHUB_CLIENT_ID || ''
    const redirectUri = process.env.EXPO_PUBLIC_REDIRECT_URI || 'exp://localhost:8081'
    
    return `${baseUrl}/api/auth/signin/github?callbackUrl=${encodeURIComponent(redirectUri)}&client_id=${clientId}`
  }
}

export const authService = AuthService.getInstance()
