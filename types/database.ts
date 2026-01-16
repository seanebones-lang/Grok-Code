export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      todos: {
        Row: {
          id: number
          text: string
          done: boolean
          created_at: string
          user_id: string
        }
        Insert: {
          text: string
          done?: boolean
          user_id: string
        }
        Update: {
          text?: string
          done?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: {
        Row: Record<string, unknown>
      }
    }
    Functions: {
      [_ in never]: {
        Args: Record<string, unknown>
        Returns: unknown
      }
    }
    Enums: {
      [_ in never]: {
        [select: string]: string | number | boolean
      }
    }
    CompositeTypes: {
      [_ in never]: Record<string, unknown>
    }
  }
}
