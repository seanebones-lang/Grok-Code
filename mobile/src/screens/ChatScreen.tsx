/**
 * Chat Screen
 * Full chat interface with message history and agent selection
 */

import React, { useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRoute } from '@react-navigation/native'
import { api } from '../api/client'
import * as Haptics from 'expo-haptics'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

interface ChatScreenProps {
  route?: {
    params?: {
      agentId?: string
    }
  }
}

export default function ChatScreen({ route }: ChatScreenProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [conversationId, setConversationId] = useState<string | undefined>()
  const flatListRef = useRef<FlatList>(null)
  const queryClient = useQueryClient()
  const agentId = route?.params?.agentId

  const sendMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await api.chatSend(message, conversationId, agentId ? 'agent' : undefined)
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to send message')
      }
      return response
    },
    onSuccess: (response) => {
      // Add assistant response
      if (response.data) {
        const assistantMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: typeof response.data === 'string' 
            ? response.data 
            : response.data.message || 'Response received',
          timestamp: Date.now(),
        }
        setMessages((prev) => [...prev, assistantMessage])
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      }
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true })
      }, 100)
    },
    onError: (error) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to send message'}`,
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, errorMessage])
    },
  })

  const sendMessage = () => {
    if (!input.trim() || sendMutation.isPending) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    sendMutation.mutate(userMessage.content)

    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true })
    }, 100)
  }

  useEffect(() => {
    // Welcome message
    const welcomeMessage: Message = {
      id: 'welcome',
      role: 'assistant',
      content: agentId
        ? `Hello! I'm ready to help. How can I assist you today?`
        : 'Hello! I'm Grok Swarm. How can I help you today?',
      timestamp: Date.now(),
    }
    setMessages([welcomeMessage])
  }, [agentId])

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user'
    return (
      <View
        style={[
          styles.messageContainer,
          isUser ? styles.userMessage : styles.assistantMessage,
        ]}
      >
        <Text style={[styles.messageText, isUser && styles.userMessageText]}>
          {item.content}
        </Text>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Message Grok..."
          placeholderTextColor="#9ca3af"
          multiline
          maxLength={50000}
          editable={!sendMutation.isPending}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!input.trim() || sendMutation.isPending) && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!input.trim() || sendMutation.isPending}
        >
          {sendMutation.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.sendButtonText}>Send</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  messageContainer: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 12,
    marginVertical: 4,
  },
  userMessage: {
    backgroundColor: '#6841e7',
    alignSelf: 'flex-end',
  },
  assistantMessage: {
    backgroundColor: '#1a1a2e',
    alignSelf: 'flex-start',
  },
  messageText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#fff',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#1a1a2e',
    backgroundColor: '#0a0a0a',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#6841e7',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})
