import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import * as path from 'path'
import { resolveSafeCwd, isInsideAppRoot, APP_ROOT_BLOCKED_MESSAGE } from '@/lib/workspace-guard'

/**
 * Terminal API for Agentic Operations
 * Executes shell commands server-side for local tool execution (run_command, search_code)
 *
 * SECURITY: Full shell access. Only enable for trusted/single-user deployments.
 * WORKSPACE: Never runs in the Grok Code app directory; uses sandbox or provided workspace.
 */
const MAX_OUTPUT_SIZE = 128 * 1024 // 128KB
const TIMEOUT_MS = 30000 // 30s

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()

  try {
    const body = await request.json()
    const command = typeof body.command === 'string' ? body.command.trim() : ''
    const cwdRaw = body.cwd as string | undefined
    const requestedCwd = cwdRaw
      ? path.isAbsolute(cwdRaw)
        ? cwdRaw
        : path.resolve(process.cwd(), cwdRaw)
      : undefined

    if (requestedCwd !== undefined && isInsideAppRoot(requestedCwd)) {
      return NextResponse.json(
        { error: APP_ROOT_BLOCKED_MESSAGE, requestId },
        { status: 400 }
      )
    }

    const cwd = resolveSafeCwd(cwdRaw)

    if (!command) {
      return NextResponse.json(
        { error: 'Command is required', requestId },
        { status: 400 }
      )
    }

    const result = await new Promise<{ exitCode: number; output: string; stderr?: string }>(
      (resolve) => {
        const parts = command.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || []
        const cmd = parts[0]
        const args = (parts.slice(1) || []).map((arg: string) =>
          arg.replace(/^["']|["']$/g, '')
        )

        const child = spawn(cmd, args, {
          cwd,
          env: process.env,
          shell: true, // Allow shell builtins and globs
        })

        let stdout = ''
        let stderr = ''
        const timeout = setTimeout(() => {
          child.kill('SIGTERM')
          resolve({
            exitCode: -1,
            output: stdout + (stderr ? `\nStderr:\n${stderr}` : ''),
            stderr: 'Command timed out after 30s',
          })
        }, TIMEOUT_MS)

        const append = (buf: Buffer | string, dest: 'stdout' | 'stderr') => {
          const str = buf.toString()
          if (dest === 'stdout') {
            stdout += str
            if (stdout.length > MAX_OUTPUT_SIZE) {
              stdout = stdout.slice(0, MAX_OUTPUT_SIZE) + '\n... (truncated)'
              child.kill('SIGTERM')
            }
          } else {
            stderr += str
          }
        }

        child.stdout?.on('data', (d) => append(d, 'stdout'))
        child.stderr?.on('data', (d) => append(d, 'stderr'))

        child.on('close', (code, signal) => {
          clearTimeout(timeout)
          const output = stdout + (stderr ? `\nStderr:\n${stderr}` : '')
          resolve({
            exitCode: code ?? -1,
            output,
            stderr: stderr || undefined,
          })
        })

        child.on('error', (err) => {
          clearTimeout(timeout)
          resolve({
            exitCode: -1,
            output: '',
            stderr: err.message,
          })
        })
      }
    )

    return NextResponse.json({
      success: result.exitCode === 0,
      exitCode: result.exitCode,
      output: result.output,
      stdout: result.output.split('\nStderr:\n')[0],
      stderr: result.stderr,
      requestId,
    })
  } catch (error) {
    console.error(`[${requestId}] Terminal error:`, error)
    return NextResponse.json(
      {
        error: 'Command execution failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        requestId,
      },
      { status: 500 }
    )
  }
}
