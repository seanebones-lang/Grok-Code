/**
 * Login Screen
 * Enhanced OAuth authentication flow with expo-auth-session
 */

import React, { useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useAuthRequest, exchangeCodeForToken } from '../auth/AuthService'
import * as Haptics from 'expo-haptics'

export default function LoginScreen() {
  const [request, response, promptAsync] = useAuthRequest()
  const navigation = useNavigation()
  const [isLoading, setIsLoading] = React.useState(false)

  useEffect(() => {
    if (response?.type === 'success' && response.params?.code) {
      handleOAuthSuccess(response.params.code)
    } else if (response?.type === 'error') {
      handleOAuthError(response.params?.error || 'Authentication failed')
    }
  }, [response])

  const handleOAuthSuccess = async (code: string) => {
    setIsLoading(true)
    try {
      const redirectUri = request?.redirectUri || 'grokswarm://auth'
      const success = await exchangeCodeForToken(code)
      
      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        // Navigation will be handled by App.tsx checking auth state
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' as never }],
        })
      } else {
        Alert.alert('Error', 'Failed to complete authentication')
      }
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Authentication failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOAuthError = (error: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    Alert.alert('Authentication Error', error)
    setIsLoading(false)
  }

  const handleLogin = async () => {
    if (!request) {
      Alert.alert('Error', 'Authentication request not ready')
      return
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      await promptAsync()
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to open login')
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Grok Swarm</Text>
        <Text style={styles.subtitle}>AI-Powered Development Assistant</Text>
        
        <TouchableOpacity
          style={[styles.button, (isLoading || !request) && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={isLoading || !request}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Login with GitHub</Text>
          )}
        </TouchableOpacity>

        {!request && (
          <Text style={styles.hint}>Preparing authentication...</Text>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '80%',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#9ca3af',
    marginBottom: 32,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#6841e7',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
    minWidth: 200,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  hint: {
    marginTop: 16,
    color: '#9ca3af',
    fontSize: 12,
  },
})
