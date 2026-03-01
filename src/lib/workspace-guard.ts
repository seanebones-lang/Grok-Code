/**
 * Prevents the app from running commands or operating in its own repo (Grok Code).
 * Use when executing agent/terminal commands so the "connected repo" is never
 * confused with the app directory.
 */

import * as path from 'path'
import * as fs from 'fs'

/** This app's root (Grok Code project root when running next dev). */
export const APP_ROOT = process.cwd()

/** Safe default cwd for run_command when no workspace is specified. Not inside app source. */
export const AGENT_WORKSPACE = path.join(APP_ROOT, 'sandbox', 'agent-workspace')

/** Normalize for comparison (handles trailing slashes, etc.). */
function normalized(p: string): string {
  return path.normalize(path.resolve(p))
}

/** True if the path is the app root or inside src/ (the app's own code). */
export function isInsideAppRoot(cwd: string): boolean {
  const n = normalized(cwd)
  const root = normalized(APP_ROOT)
  if (n === root) return true
  const srcDir = normalized(path.join(APP_ROOT, 'src'))
  return n.startsWith(srcDir + path.sep) || n === srcDir
}

/** Resolve cwd for execution. Never returns a path inside app root; uses AGENT_WORKSPACE if needed. */
export function resolveSafeCwd(cwdRaw: string | undefined): string {
  const raw = cwdRaw?.trim()
  if (!raw) return ensureWorkspaceDir(AGENT_WORKSPACE)
  const resolved = path.isAbsolute(raw) ? raw : path.resolve(APP_ROOT, raw)
  if (isInsideAppRoot(resolved)) {
    return ensureWorkspaceDir(AGENT_WORKSPACE)
  }
  return resolved
}

/** Ensure directory exists (mkdir -p). Returns the path. */
function ensureWorkspaceDir(dir: string): string {
  try {
    fs.mkdirSync(dir, { recursive: true })
  } catch {
    // ignore
  }
  return dir
}

/** Message to return when caller explicitly tries to use app root as cwd. */
export const APP_ROOT_BLOCKED_MESSAGE =
  'Commands cannot run in the Grok Code app directory. Connect a repo and use that workspace, or run in sandbox/agent-workspace.'
