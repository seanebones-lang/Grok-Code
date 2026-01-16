 'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type Todo = Database['public']['Tables']['todos']['Row']

export default function TodosPage() {
  const supabase = createClient()
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState< any >(null)
  const [newTodo, setNewTodo] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, s) => {
      setSession(s)
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  useEffect(() => {
    if (session) {
      fetchTodos()
    }
  }, [session])

  async function fetchTodos() {
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .eq('user_id', session!.user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching todos:', error)
    } else {
      setTodos(data || [])
    }
  }

  async function handleAuth(action: 'signIn' | 'signUp') {
    setAuthLoading(true)
    let error
    if (action === 'signIn') {
      ({ error } = await supabase.auth.signInWithPassword({ email, password }))
    } else {
      ({ error } = await supabase.auth.signUp({ email, password }))
    }
    setAuthLoading(false)
    if (error) alert(error.message)
  }

  async function addTodo() {
    if (!newTodo.trim() || !session) return

    const { error } = await supabase
      .from('todos')
      .insert([{ text: newTodo.trim(), user_id: session.user.id, done: false }])

    setNewTodo('')
    if (!error) fetchTodos()
  }

  async function toggleTodo(id: number, done: boolean) {
    const { error } = await supabase
      .from('todos')
      .update({ done: !done })
      .eq('id', id)

    if (!error) fetchTodos()
  }

  async function deleteTodo(id: number) {
    const { error } = await supabase
      .from('todos')
      .delete()
      .eq('id', id)

    if (!error) fetchTodos()
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>
  }

  if (!session?.user) {
    return (
      <div className="max-w-md mx-auto mt-10 p-8 border rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold mb-6 text-center">Todo App</h1>
        <h2 className="text-xl mb-4">Sign In / Up</h2>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full p-3 border border-gray-300 rounded-md mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full p-3 border border-gray-300 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={() => handleAuth('signIn')}
          disabled={authLoading}
          className="w-full p-3 bg-blue-500 text-white rounded-md mb-2 hover:bg-blue-600 disabled:opacity-50"
        >
          Sign In
        </button>
        <button
          onClick={() => handleAuth('signUp')}
          disabled={authLoading}
          className="w-full p-3 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50"
        >
          Sign Up
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto mt-10 p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900">My Todos</h1>
        <button
          onClick={signOut}
          className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
        >
          Sign Out
        </button>
      </div>
      <div className="flex gap-3 mb-8">
        <input
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          placeholder="Add a new todo..."
          onKeyDown={(e) => e.key === 'Enter' && addTodo()}
          className="flex-1 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={addTodo}
          disabled={!newTodo.trim()}
          className="px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 transition-colors"
        >
          Add
        </button>
      </div>
      <ul className="space-y-3">
        {todos.map((todo) => (
          <li key={todo.id} className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
            <input
              type="checkbox"
              checked={todo.done}
              onChange={() => toggleTodo(todo.id, todo.done)}
              className="w-5 h-5 rounded focus:ring-blue-500"
            />
            <span className={`flex-1 ${todo.done ? 'line-through text-gray-500' : 'text-gray-900'}`}>
              {todo.text}
            </span>
            <span className="text-xs text-gray-500">
              {new Date(todo.created_at).toLocaleDateString()}
            </span>
            <button
              onClick={() => deleteTodo(todo.id)}
              className="ml-auto px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
      {todos.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>No todos yet. Add one above!</p>
        </div>
      )}
    </div>
  )
}
