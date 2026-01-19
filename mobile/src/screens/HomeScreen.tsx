/**
 * Home Screen
 * Enhanced with React Query for data fetching
 */

import React from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useNavigation } from '@react-navigation/native'
import { authService } from '../auth/AuthService'
import { api } from '../api/client'
import * as Haptics from 'expo-haptics'

interface Agent {
  id: string
  name: string
  emoji: string
  description: string
}

export default function HomeScreen() {
  const navigation = useNavigation()
  const user = authService.getCurrentUser()

  const {
    data: agentsData,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const response = await api.agents()
      if (response.success && response.data) {
        return response.data.agents
      }
      throw new Error(response.error?.message || 'Failed to load agents')
    },
  })

  const agents: Agent[] = agentsData || []

  const handleRefresh = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    await refetch()
  }

  const handleAgentPress = (agent: Agent) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    navigation.navigate('Chat' as never, { agentId: agent.id } as never)
  }

  const handleLogout = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    await authService.logout()
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' as never }],
    })
  }

  const handleChat = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    navigation.navigate('Chat' as never)
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>Welcome, {user?.name || user?.email}</Text>
          <Text style={styles.subtitle}>Select an agent to get started</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.chatButton} onPress={handleChat}>
          <Text style={styles.chatButtonText}>💬 Start Chat</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Available Agents ({agents.length})</Text>
      
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6841e7" />
          <Text style={styles.loadingText}>Loading agents...</Text>
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Failed to load agents</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={agents}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.agentCard}
              onPress={() => handleAgentPress(item)}
            >
              <Text style={styles.agentEmoji}>{item.emoji}</Text>
              <View style={styles.agentInfo}>
                <Text style={styles.agentName}>{item.name}</Text>
                <Text style={styles.agentDescription}>{item.description}</Text>
              </View>
            </TouchableOpacity>
          )}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={handleRefresh}
              tintColor="#6841e7"
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>No agents available</Text>
            </View>
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
  },
  welcome: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
  },
  logoutButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#1a1a2e',
    borderRadius: 6,
  },
  logoutText: {
    color: '#fff',
    fontSize: 14,
  },
  actions: {
    padding: 16,
  },
  chatButton: {
    backgroundColor: '#6841e7',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  chatButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    color: '#9ca3af',
    fontSize: 16,
    marginTop: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#6841e7',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
  },
  retryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  agentCard: {
    flexDirection: 'row',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    alignItems: 'center',
  },
  agentEmoji: {
    fontSize: 32,
    marginRight: 16,
  },
  agentInfo: {
    flex: 1,
  },
  agentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  agentDescription: {
    fontSize: 14,
    color: '#9ca3af',
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: 16,
  },
})
