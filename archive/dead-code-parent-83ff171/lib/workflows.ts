/**
 * Workflow Templates System
 * Pre-defined multi-step workflows that chain agents and actions
 */

// ============================================================================
// Types
// ============================================================================

export interface WorkflowStep {
  id: string
  name: string
  agentId?: string
  prompt: string
  optional?: boolean
  waitForApproval?: boolean
}

export interface Workflow {
  id: string
  name: string
  emoji: string
  description: string
  category: 'development' | 'quality' | 'devops' | 'data'
  steps: WorkflowStep[]
  estimatedTime: string
  tags: string[]
}

// ============================================================================
// Workflow Definitions
// ============================================================================

export const WORKFLOWS: Workflow[] = [
  // Development Workflows
  {
    id: 'new-feature',
    name: 'New Feature',
    emoji: '🆕',
    description: 'Build a complete feature from planning to testing',
    category: 'development',
    steps: [
      {
        id: 'plan',
        name: 'Plan Architecture',
        agentId: 'fullstack',
        prompt: 'Help me plan the architecture for this new feature. Consider database schema, API endpoints, and UI components.',
      },
      {
        id: 'database',
        name: 'Database Setup',
        agentId: 'database',
        prompt: 'Create the database schema and migrations for this feature.',
        optional: true,
      },
      {
        id: 'api',
        name: 'Build API',
        agentId: 'api',
        prompt: 'Implement the API endpoints for this feature with proper validation and error handling.',
      },
      {
        id: 'frontend',
        name: 'Build UI',
        agentId: 'uiux',
        prompt: 'Create the frontend components with a beautiful, responsive design.',
      },
      {
        id: 'test',
        name: 'Add Tests',
        agentId: 'testing',
        prompt: 'Generate comprehensive tests for the feature we just built.',
      },
    ],
    estimatedTime: '30-60 min',
    tags: ['full stack', 'feature', 'build', 'create'],
  },
  {
    id: 'bug-fix',
    name: 'Bug Fix',
    emoji: '🐛',
    description: 'Diagnose, fix, and verify a bug',
    category: 'quality',
    steps: [
      {
        id: 'diagnose',
        name: 'Diagnose Issue',
        agentId: 'bugHunter',
        prompt: 'Help me diagnose this bug. Find the root cause and affected code.',
      },
      {
        id: 'fix',
        name: 'Implement Fix',
        agentId: 'bugHunter',
        prompt: 'Implement the fix for this bug with proper error handling.',
      },
      {
        id: 'test',
        name: 'Add Regression Test',
        agentId: 'testing',
        prompt: 'Create a regression test to prevent this bug from happening again.',
      },
      {
        id: 'review',
        name: 'Code Review',
        agentId: 'codeReview',
        prompt: 'Review the bug fix for quality and potential issues.',
        optional: true,
      },
    ],
    estimatedTime: '15-30 min',
    tags: ['bug', 'fix', 'debug', 'error'],
  },
  {
    id: 'code-quality',
    name: 'Code Quality Audit',
    emoji: '✨',
    description: 'Comprehensive code quality check and improvements',
    category: 'quality',
    steps: [
      {
        id: 'review',
        name: 'Code Review',
        agentId: 'codeReview',
        prompt: 'Perform a deep code review. Check for best practices, patterns, and improvements.',
      },
      {
        id: 'security',
        name: 'Security Scan',
        agentId: 'security',
        prompt: 'Scan for security vulnerabilities and compliance issues.',
      },
      {
        id: 'performance',
        name: 'Performance Check',
        agentId: 'performance',
        prompt: 'Analyze performance and identify optimization opportunities.',
      },
      {
        id: 'optimize',
        name: 'Optimize',
        agentId: 'optimization',
        prompt: 'Apply the recommended optimizations and refactoring.',
        waitForApproval: true,
      },
    ],
    estimatedTime: '20-40 min',
    tags: ['quality', 'review', 'security', 'performance'],
  },
  {
    id: 'api-development',
    name: 'API Development',
    emoji: '🔌',
    description: 'Design and build a complete API',
    category: 'development',
    steps: [
      {
        id: 'design',
        name: 'API Design',
        agentId: 'api',
        prompt: 'Design the API structure with endpoints, request/response schemas, and authentication.',
      },
      {
        id: 'database',
        name: 'Database Schema',
        agentId: 'database',
        prompt: 'Create the database schema to support this API.',
      },
      {
        id: 'implement',
        name: 'Implementation',
        agentId: 'api',
        prompt: 'Implement the API endpoints with proper validation and error handling.',
      },
      {
        id: 'docs',
        name: 'Documentation',
        agentId: 'documentation',
        prompt: 'Generate API documentation with examples and OpenAPI spec.',
      },
      {
        id: 'test',
        name: 'API Tests',
        agentId: 'testing',
        prompt: 'Create comprehensive API tests including edge cases.',
      },
    ],
    estimatedTime: '45-90 min',
    tags: ['api', 'rest', 'graphql', 'backend'],
  },
  {
    id: 'mobile-feature',
    name: 'Mobile Feature',
    emoji: '📱',
    description: 'Build a mobile app feature with native feel',
    category: 'mobile',
    steps: [
      {
        id: 'design',
        name: 'Mobile UI Design',
        agentId: 'mobile',
        prompt: 'Design the mobile UI with platform-specific considerations (iOS/Android).',
      },
      {
        id: 'implement',
        name: 'Implementation',
        agentId: 'mobile',
        prompt: 'Implement the feature with proper navigation and state management.',
      },
      {
        id: 'accessibility',
        name: 'Accessibility',
        agentId: 'accessibility',
        prompt: 'Ensure the feature is accessible on mobile devices.',
      },
      {
        id: 'test',
        name: 'Mobile Testing',
        agentId: 'testing',
        prompt: 'Create tests for this mobile feature including gesture handling.',
      },
    ],
    estimatedTime: '30-60 min',
    tags: ['mobile', 'ios', 'android', 'react native', 'flutter'],
  },
  {
    id: 'deploy-production',
    name: 'Deploy to Production',
    emoji: '🚀',
    description: 'Prepare and deploy to production safely',
    category: 'devops',
    steps: [
      {
        id: 'security',
        name: 'Security Check',
        agentId: 'security',
        prompt: 'Run a security scan before deployment.',
      },
      {
        id: 'performance',
        name: 'Performance Check',
        agentId: 'performance',
        prompt: 'Verify performance is acceptable for production.',
      },
      {
        id: 'deploy',
        name: 'Deployment Setup',
        agentId: 'devops',
        prompt: 'Set up or verify the deployment pipeline and configuration.',
      },
      {
        id: 'monitor',
        name: 'Monitoring Setup',
        agentId: 'devops',
        prompt: 'Configure monitoring and alerts for the deployment.',
        optional: true,
      },
    ],
    estimatedTime: '20-45 min',
    tags: ['deploy', 'production', 'ci/cd', 'devops'],
  },
  {
    id: 'refactor',
    name: 'Code Refactoring',
    emoji: '🔄',
    description: 'Safe, systematic code refactoring',
    category: 'quality',
    steps: [
      {
        id: 'analyze',
        name: 'Analyze Code',
        agentId: 'codeReview',
        prompt: 'Analyze the code to understand the current structure and identify refactoring opportunities.',
      },
      {
        id: 'test-before',
        name: 'Ensure Tests',
        agentId: 'testing',
        prompt: 'Make sure we have test coverage before refactoring.',
      },
      {
        id: 'refactor',
        name: 'Refactor',
        agentId: 'optimization',
        prompt: 'Apply the refactoring changes systematically.',
      },
      {
        id: 'verify',
        name: 'Verify',
        agentId: 'testing',
        prompt: 'Run tests to verify the refactoring didn\'t break anything.',
      },
    ],
    estimatedTime: '20-40 min',
    tags: ['refactor', 'clean code', 'improve'],
  },
  {
    id: 'ai-integration',
    name: 'AI/ML Integration',
    emoji: '🤖',
    description: 'Add AI capabilities to your app',
    category: 'data',
    steps: [
      {
        id: 'design',
        name: 'AI Architecture',
        agentId: 'aiml',
        prompt: 'Design the AI integration architecture - model selection, data flow, and API design.',
      },
      {
        id: 'implement',
        name: 'Implementation',
        agentId: 'aiml',
        prompt: 'Implement the AI integration with proper error handling and fallbacks.',
      },
      {
        id: 'optimize',
        name: 'Optimize',
        agentId: 'aiml',
        prompt: 'Optimize prompts, caching, and cost efficiency.',
      },
      {
        id: 'test',
        name: 'Test & Evaluate',
        agentId: 'testing',
        prompt: 'Create tests and evaluation metrics for the AI integration.',
      },
    ],
    estimatedTime: '30-60 min',
    tags: ['ai', 'ml', 'llm', 'gpt', 'embeddings'],
  },
  {
    id: 'data-pipeline',
    name: 'Data Pipeline',
    emoji: '📊',
    description: 'Build a data processing pipeline',
    category: 'data',
    steps: [
      {
        id: 'design',
        name: 'Pipeline Design',
        agentId: 'data',
        prompt: 'Design the data pipeline - sources, transformations, and destinations.',
      },
      {
        id: 'database',
        name: 'Schema Design',
        agentId: 'database',
        prompt: 'Design the database schema for the pipeline data.',
      },
      {
        id: 'implement',
        name: 'Implementation',
        agentId: 'data',
        prompt: 'Implement the data pipeline with proper validation and error handling.',
      },
      {
        id: 'monitor',
        name: 'Monitoring',
        agentId: 'devops',
        prompt: 'Set up monitoring and alerting for the data pipeline.',
      },
    ],
    estimatedTime: '45-90 min',
    tags: ['data', 'etl', 'pipeline', 'analytics'],
  },
  {
    id: 'quick-review',
    name: 'Quick Code Review',
    emoji: '👀',
    description: 'Fast review of recent changes',
    category: 'quality',
    steps: [
      {
        id: 'review',
        name: 'Review Changes',
        agentId: 'codeReview',
        prompt: 'Review the recent code changes for quality, bugs, and best practices.',
      },
      {
        id: 'security',
        name: 'Security Check',
        agentId: 'security',
        prompt: 'Quick security scan of the changed code.',
        optional: true,
      },
    ],
    estimatedTime: '10-15 min',
    tags: ['review', 'quick', 'changes'],
  },
]

// ============================================================================
// Helper Functions
// ============================================================================

export function getWorkflow(id: string): Workflow | undefined {
  return WORKFLOWS.find(w => w.id === id)
}

export function getWorkflowsByCategory(category: Workflow['category']): Workflow[] {
  return WORKFLOWS.filter(w => w.category === category)
}

export function searchWorkflows(query: string): Workflow[] {
  const lowerQuery = query.toLowerCase()
  return WORKFLOWS.filter(w => {
    return (
      w.name.toLowerCase().includes(lowerQuery) ||
      w.description.toLowerCase().includes(lowerQuery) ||
      w.tags.some(t => t.includes(lowerQuery))
    )
  })
}

export function formatWorkflowPrompt(workflow: Workflow, context?: string): string {
  const stepsPreview = workflow.steps
    .map((s, i) => `${i + 1}. ${s.name}${s.optional ? ' (optional)' : ''}`)
    .join('\n')
  
  return `I want to run the "${workflow.name}" workflow.

**Steps:**
${stepsPreview}

${context ? `**Context:** ${context}` : 'Please guide me through this workflow step by step.'}

Start with step 1: ${workflow.steps[0].name}`
}

export const WORKFLOW_CATEGORIES = [
  { id: 'development', name: 'Development', emoji: '💻' },
  { id: 'quality', name: 'Quality', emoji: '✨' },
  { id: 'devops', name: 'DevOps', emoji: '🚀' },
  { id: 'data', name: 'Data & AI', emoji: '📊' },
] as const
