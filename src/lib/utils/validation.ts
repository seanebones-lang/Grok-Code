// Validation utilities
export const isToolCall = (obj: any): obj is { tool: string; args: any } => {
  return obj && typeof obj === 'object' && 'tool' in obj && typeof obj.tool === 'string'
}

export const safeParseJSON = <T>(str: string, defaultValue: T): T => {
  try {
    return JSON.parse(str) as T
  } catch {
    return defaultValue
  }
}
