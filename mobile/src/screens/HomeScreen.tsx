/**
 * Home Screen
 * Main screen after authentication
 */

import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native'
import { authService } from '../auth/AuthService'
import { apiClient } from '../api/client'
import { useNavigation } from '@react-navigation/native'

interface Agent {
  id: string
  name: string
  emoji: string
  description: string
}

export default function HomeScreen() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const navigation = useNavigation()
  const user = authService.getCurrentUser()

  useEffect(() => {
    loadAgents()
  }, [])

  const loadAgents = async () => {
    try {
      const response = await apiClient.getAgents()
      if (response.success && response.data) {
        setAgents(response.data.agents)
      }
    } catch (error) {
      console.error('Failed to load agents:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadAgents()
    setRefreshing(false)
  }

  const handleLogout = async () => {
    await authService.logout()
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' as never }],
    })
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcome}>Welcome, {user?.name || user?.email}</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Available Agents</Text>
      
      {isLoading ? (
        <View style={styles.center}>
          <Text style={styles.loadingText}>Loading agents...</Text>
        </View>
      ) : (
        <FlatList
          data={agents}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.agentCard}>
              <Text style={styles.agentEmoji}>{item.emoji}</Text>
              <View style={styles.agentInfo}>
                <Text style={styles.agentName}>{item.name}</Text>
                <Text style={styles.agentDescription}>{item.description}</Text>
              </View>
            </View>
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#9ca3af',
    fontSize: 16,
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
