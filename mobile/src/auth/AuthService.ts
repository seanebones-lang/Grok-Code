/**
 * Mobile Authentication Service
 * Enhanced with expo-auth-session for proper OAuth flow
 */

import * as AuthSession from 'expo-auth-session'
import * as SecureStore from 'expo-secure-store'
import { api } from '../api/client'
import * as Haptics from 'expo-haptics'

const GITHUB_CLIENT_ID = process.env.EXPO_PUBLIC_GITHUB_CLIENT_ID || ''
const REDIRECT_URI = process.env.EXPO_PUBLIC_REDIRECT_URI || 'grokswarm://auth'

const discovery = {
  authorizationEndpoint: 'https://github.com/login/oauth/authorize',
  tokenEndpoint: 'https://github.com/login/oauth/access_token',
}

export interface User {
  id: string
  email: string
  name?: string
}

/**
 * Use GitHub OAuth request hook
 */
export const useAuthRequest = () => {
  return AuthSession.useAuthRequest(
    {
      clientId: GITHUB_CLIENT_ID,
      scopes: ['user', 'repo'],
      redirectUri: AuthSession.makeRedirectUri({
        scheme: 'grokswarm',
        path: 'auth',
      }),
    },
    discovery
  )
}

/**
 * Exchange OAuth code for JWT tokens
 */
export const exchangeCodeForToken = async (code: string): Promise<boolean> => {
  try {
    const redirectUri = AuthSession.makeRedirectUri({
      scheme: 'grokswarm',
      path: 'auth',
    })

    const response = await api.login(code, redirectUri)

    if (!response.success || !response.data) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      return false
    }

    // Store tokens securely
    await SecureStore.setItemAsync('mobile_access_token', response.data.access_token)
    await SecureStore.setItemAsync('mobile_refresh_token', response.data.refresh_token)
    await SecureStore.setItemAsync('mobile_user', JSON.stringify(response.data.user))

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    return true
  } catch (error) {
    console.error('Token exchange error:', error)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    return false
  }
}

/**
 * Get current user from secure storage
 */
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const userJson = await SecureStore.getItemAsync('mobile_user')
    if (userJson) {
      return JSON.parse(userJson)
    }
    return null
  } catch (error) {
    console.error('Get user error:', error)
    return null
  }
}

/**
 * Check if user is authenticated
 */
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    const token = await SecureStore.getItemAsync('mobile_access_token')
    return token !== null
  } catch {
    return false
  }
}

/**
 * Logout - clear all stored data
 */
export const logout = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync('mobile_access_token')
    await SecureStore.deleteItemAsync('mobile_refresh_token')
    await SecureStore.deleteItemAsync('mobile_user')
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  } catch (error) {
    console.error('Logout error:', error)
  }
}

/**
 * Legacy AuthService class for backward compatibility
 */
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

  async initialize(): Promise<void> {
    try {
      const accessToken = await SecureStore.getItemAsync('mobile_access_token')
      const refreshToken = await SecureStore.getItemAsync('mobile_refresh_token')
      const userJson = await SecureStore.getItemAsync('mobile_user')

      if (accessToken && refreshToken && userJson) {
        this.currentUser = JSON.parse(userJson)
      }
    } catch (error) {
      console.error('Auth initialization error:', error)
    }
  }

  async login(code: string, redirectUri: string): Promise<{ success: boolean; error?: string }> {
    const success = await exchangeCodeForToken(code)
    if (success) {
      this.currentUser = await getCurrentUser()
    }
    return {
      success,
      error: success ? undefined : 'Login failed',
    }
  }

  async logout(): Promise<void> {
    await logout()
    this.currentUser = null
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null
  }

  getCurrentUser(): User | null {
    return this.currentUser
  }

  getOAuthUrl(): string {
    return AuthSession.makeRedirectUri({
      scheme: 'grokswarm',
      path: 'auth',
    })
  }
}

export const authService = AuthService.getInstance()
