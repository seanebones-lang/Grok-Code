/**
 * Login Screen
 * OAuth authentication flow for mobile app
 */

import React, { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking,
} from 'react-native'
import { authService } from '../auth/AuthService'
import { useNavigation } from '@react-navigation/native'

export default function LoginScreen() {
  const [isLoading, setIsLoading] = useState(false)
  const navigation = useNavigation()

  const handleLogin = async () => {
    setIsLoading(true)
    try {
      const oauthUrl = authService.getOAuthUrl()
      
      // Open OAuth URL in browser
      const supported = await Linking.canOpenURL(oauthUrl)
      if (supported) {
        await Linking.openURL(oauthUrl)
        // In production, handle OAuth callback via deep linking
        Alert.alert(
          'Login',
          'Complete authentication in your browser, then return to the app.',
          [{ text: 'OK' }]
        )
      } else {
        Alert.alert('Error', 'Cannot open authentication URL')
      }
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Grok Swarm</Text>
        <Text style={styles.subtitle}>AI-Powered Development Assistant</Text>
        
        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Connecting...' : 'Login with GitHub'}
          </Text>
        </TouchableOpacity>
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
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
})
