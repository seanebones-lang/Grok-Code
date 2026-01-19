/**
 * Chat Screen Tests
 * Jest tests for ChatScreen component
 */

import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react-native'
import ChatScreen from '../src/screens/ChatScreen'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock API client
jest.mock('../src/api/client', () => ({
  api: {
    chatSend: jest.fn(),
  },
}))

// Mock Haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
}))

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

describe('ChatScreen', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = createTestQueryClient()
    jest.clearAllMocks()
  })

  it('renders welcome message', () => {
    const { getByText } = render(
      <QueryClientProvider client={queryClient}>
        <ChatScreen />
      </QueryClientProvider>
    )

    expect(getByText(/Hello! I'm Grok Swarm/i)).toBeTruthy()
  })

  it('allows user to type message', () => {
    const { getByPlaceholderText } = render(
      <QueryClientProvider client={queryClient}>
        <ChatScreen />
      </QueryClientProvider>
    )

    const input = getByPlaceholderText('Message Grok...')
    fireEvent.changeText(input, 'Hello, Grok!')
    expect(input.props.value).toBe('Hello, Grok!')
  })

  it('sends message when send button is pressed', async () => {
    const { api } = require('../src/api/client')
    api.chatSend.mockResolvedValue({
      success: true,
      data: { message: 'Response from Grok' },
    })

    const { getByPlaceholderText, getByText } = render(
      <QueryClientProvider client={queryClient}>
        <ChatScreen />
      </QueryClientProvider>
    )

    const input = getByPlaceholderText('Message Grok...')
    const sendButton = getByText('Send')

    fireEvent.changeText(input, 'Hello')
    fireEvent.press(sendButton)

    await waitFor(() => {
      expect(api.chatSend).toHaveBeenCalledWith('Hello', undefined, undefined)
    })
  })

  it('disables send button when input is empty', () => {
    const { getByText } = render(
      <QueryClientProvider client={queryClient}>
        <ChatScreen />
      </QueryClientProvider>
    )

    const sendButton = getByText('Send')
    expect(sendButton.props.disabled).toBe(true)
  })
})
