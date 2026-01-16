// Self-evolve API - Spawn evolve.py with goal
import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'

export async function POST(req: NextRequest) {
  try {
    const { goal } = await req.json()
    
    if (!goal) {
      return NextResponse.json({ error: 'Goal is required' }, { status: 400 })
    }

    // Spawn Python evolve script
    const py = spawn('python', ['sandbox/evolve.py', goal])
    
    let output = ''
    let errorOutput = ''

    py.stdout.on('data', (data) => {
      output += data.toString()
    })

    py.stderr.on('data', (data) => {
      errorOutput += data.toString()
    })

    // Wait for process to complete with timeout
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        py.kill()
        reject(new Error('Process timeout'))
      }, 30000)

      py.on('close', (code) => {
        clearTimeout(timeout)
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`Process exited with code ${code}`))
        }
      })

      py.on('error', (err) => {
        clearTimeout(timeout)
        reject(err)
      })
    })

    return NextResponse.json({ 
      log: output || 'Evolved!',
      error: errorOutput || null 
    })
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Evolution failed' 
    }, { status: 500 })
  }
}
