import { NextRequest, NextResponse } from 'next/server'
import { SPECIALIZED_AGENTS } from '@/lib/specialized-agents'

const SWARM_AGENT_TIMEOUT_MS = 90_000
/** Max agents running in parallel to avoid overwhelming the API */
const SWARM_CONCURRENCY = 5

function resolveAgentId(agentId: string): string | null {
  if (SPECIALIZED_AGENTS[agentId]) return agentId
  const lower = agentId.toLowerCase()
  return Object.keys(SPECIALIZED_AGENTS).find((k) => k.toLowerCase() === lower) ?? null
}

async function runOneAgent(
  origin: string,
  agentId: string,
  code: string
): Promise<{ agentId: string; content: string; error?: string }> {
  const url = `${origin}/api/chat`
  const message = `/agent ${agentId}\n\n${code}`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), SWARM_AGENT_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, mode: 'agent', history: [] }),
      signal: controller.signal,
    })
    clearTimeout(timeout)
    if (!res.ok) {
      const text = await res.text()
      return {
        agentId,
        content: '',
        error: `HTTP ${res.status}: ${text.slice(0, 200)}`,
      }
    }
    const text = await res.text()
    const lines = text.split('\n').filter((l) => l.startsWith('data: '))
    let lastContent = ''
    for (const line of lines) {
      const data = line.slice(6).trim()
      if (data === '[DONE]') break
      try {
        const parsed = JSON.parse(data) as { content?: string; error?: string }
        if (parsed.error) {
          lastContent = parsed.error
          break
        }
        if (parsed.content && parsed.content !== '[DONE]') lastContent += parsed.content
      } catch {
        // keep previous lastContent
      }
    }
    return { agentId, content: lastContent }
  } catch (e) {
    clearTimeout(timeout)
    const msg = e instanceof Error ? e.message : String(e)
    return { agentId, content: '', error: msg }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const agentsRaw = Array.isArray(body.agents) ? body.agents : []
    const code = typeof body.code === 'string' ? body.code : ''
    const agentIds = agentsRaw
      .map((id: unknown) => (typeof id === 'string' ? resolveAgentId(id) : null))
      .filter(Boolean) as string[]
    const invalid = agentsRaw.filter(
      (id: unknown) => typeof id !== 'string' || !resolveAgentId(id as string)
    )

    if (invalid.length > 0) {
      return NextResponse.json(
        {
          error: 'Invalid agent(s)',
          invalid,
          hint: 'Use list_agents to see valid ids.',
        },
        { status: 400 }
      )
    }
    if (agentIds.length === 0) {
      return NextResponse.json(
        { error: 'No valid agents provided', swarm_results: {} },
        { status: 400 }
      )
    }

    const origin = new URL(request.url).origin
    const results: Awaited<ReturnType<typeof runOneAgent>>[] = []
    for (let i = 0; i < agentIds.length; i += SWARM_CONCURRENCY) {
      const chunk = agentIds.slice(i, i + SWARM_CONCURRENCY)
      const chunkResults = await Promise.all(
        chunk.map((id) => runOneAgent(origin, id, code))
      )
      results.push(...chunkResults)
    }

    const swarm_results: Record<string, string | { error: string }> = {}
    for (const r of results) {
      if (r.error) {
        swarm_results[r.agentId] = { error: r.error }
      } else {
        swarm_results[r.agentId] = r.content
      }
    }

    return NextResponse.json({
      message: 'Swarm complete',
      swarm_results,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json(
      { error: 'Swarm failed', message: msg, swarm_results: {} },
      { status: 500 }
    )
  }
}
