'use client'

import { create } from 'zustand'

interface SearchState {
  query: string
  results: any[]
  loading: boolean
  setQuery: (query: string) => void
  setResults: (results: any[]) => void
  setLoading: (loading: boolean) => void
}

export const useSearchStore = create<SearchState>((set) => ({
  query: '',
  results: [],
  loading: false,
  setQuery: (query) => set({ query }),
  setResults: (results) => set({ results }),
  setLoading: (loading) => set({ loading }),
}))
