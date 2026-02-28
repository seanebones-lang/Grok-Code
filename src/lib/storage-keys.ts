// Keys are suffixes - storage adds nexteleven_ prefix (e.g. github_token -> nexteleven_github_token)
export const STORAGE_KEYS = {
  sidebar: 'sidebar_state',
  theme: 'theme',
  sessions: 'sessions',
  agentMemory: 'agent_memory',
  recentRepos: 'recent_repos',
  githubToken: 'github_token',
  grokApiKey: 'grok_api_key',
  connectedRepo: 'connectedRepo',
  fileTree: 'fileTree',
  selectedModel: 'selectedModel',
  environment: 'environment',
  pinnedAgents: 'pinnedAgents',
} as const
