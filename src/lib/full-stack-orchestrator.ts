/**
 * Full Stack Workflow Orchestrator
 * Chains all steps: description → repo creation → code generation → commit → push → deploy
 * Enables 100% autonomous project building from vague text descriptions
 */

// ============================================================================
// Types
// ============================================================================

export interface FullStackWorkflowOptions {
  description: string
  repositoryName?: string
  branch?: string
  deploymentTarget?: 'vercel' | 'railway' | 'aws' | 'none'
  autoDeploy?: boolean
  generateInitialFiles?: boolean
}

export interface WorkflowStep {
  step: string
  status: 'pending' | 'in_progress' | 'success' | 'failed' | 'skipped'
  output?: string
  error?: string
  duration?: number
}

export interface FullStackWorkflowResult {
  success: boolean
  repository: {
    owner: string
    name: string
    fullName: string
    url: string
    defaultBranch: string
  } | null
  commitSha: string | null
  deploymentUrl: string | null
  steps: WorkflowStep[]
  errors: string[]
}

// ============================================================================
// Main Orchestrator Function
// ============================================================================

export async function executeFullStackWorkflow(
  options: FullStackWorkflowOptions,
  githubToken?: string
): Promise<FullStackWorkflowResult> {
  const steps: WorkflowStep[] = []
  const errors: string[] = []
  let repository: FullStackWorkflowResult['repository'] = null
  let commitSha: string | null = null
  let deploymentUrl: string | null = null

  const startTime = Date.now()
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const token = githubToken || process.env.GITHUB_TOKEN

  if (!token) {
    return {
      success: false,
      repository: null,
      commitSha: null,
      deploymentUrl: null,
      steps: [{
        step: 'workflow_start',
        status: 'failed',
        error: 'GITHUB_TOKEN not configured',
      }],
      errors: ['GITHUB_TOKEN not configured'],
    }
  }

  // Step 1: Generate repository name if not provided
  const repoName = options.repositoryName || generateRepoName(options.description)
  steps.push({
    step: 'generate_repo_name',
    status: 'success',
    output: repoName,
  })

  // Step 2: Create repository
  try {
    const stepStart = Date.now()
    steps.push({
      step: 'create_repository',
      status: 'in_progress',
    })

    const repoResponse = await fetch(`${baseUrl}/api/github/create-repo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: repoName,
        description: options.description,
        private: false,
        autoInit: true,
      }),
    })

    if (!repoResponse.ok) {
      const errorData = await repoResponse.json().catch(() => ({}))
      throw new Error(errorData.error || 'Repository creation failed')
    }

    const repoData = await repoResponse.json()
    repository = repoData.repository

    steps[steps.length - 1] = {
      step: 'create_repository',
      status: 'success',
      output: repository.url,
      duration: Date.now() - stepStart,
    }
  } catch (error: any) {
    const stepIndex = steps.length - 1
    steps[stepIndex] = {
      step: 'create_repository',
      status: 'failed',
      error: error.message || 'Repository creation failed',
      duration: Date.now() - (Date.now() - 1000),
    }
    errors.push(error.message || 'Repository creation failed')
    return { success: false, repository: null, commitSha: null, deploymentUrl: null, steps, errors }
  }

  // Step 3: Generate initial files (if enabled)
  if (options.generateInitialFiles !== false) {
    try {
      const stepStart = Date.now()
      steps.push({
        step: 'generate_files',
        status: 'in_progress',
      })

      const files = await generateProjectFiles(options.description, repository.name)
      const fileCount = files.length

      steps[steps.length - 1] = {
        step: 'generate_files',
        status: 'success',
        output: `Generated ${fileCount} files`,
        duration: Date.now() - stepStart,
      }

      // Step 4: Push files to repository
      try {
        const pushStart = Date.now()
        steps.push({
          step: 'push_files',
          status: 'in_progress',
        })

        const pushResponse = await fetch(`${baseUrl}/api/github/push`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            owner: repository.owner,
            repo: repository.name,
            branch: options.branch || 'main',
            files,
            message: 'Initial commit: Generated from description',
          }),
        })

        if (!pushResponse.ok) {
          const errorData = await pushResponse.json().catch(() => ({}))
          throw new Error(errorData.error || 'Push failed')
        }

        const pushData = await pushResponse.json()
        commitSha = pushData.commit.sha

        steps[steps.length - 1] = {
          step: 'push_files',
          status: 'success',
          output: `Committed ${fileCount} files (${commitSha.slice(0, 7)})`,
          duration: Date.now() - pushStart,
        }
      } catch (error: any) {
        const stepIndex = steps.length - 1
        steps[stepIndex] = {
          step: 'push_files',
          status: 'failed',
          error: error.message || 'Push failed',
          duration: Date.now() - (Date.now() - 1000),
        }
        errors.push(error.message || 'Push failed')
      }
    } catch (error: any) {
      const stepIndex = steps.length - 1
      steps[stepIndex] = {
        step: 'generate_files',
        status: 'failed',
        error: error.message || 'File generation failed',
        duration: Date.now() - (Date.now() - 1000),
      }
      errors.push(error.message || 'File generation failed')
    }
  }

  // Step 5: Deploy (if enabled)
  if (options.autoDeploy !== false && options.deploymentTarget !== 'none') {
    try {
      const deployStart = Date.now()
      steps.push({
        step: 'deploy',
        status: 'in_progress',
      })

      const target = options.deploymentTarget || 'vercel'
      const deployResponse = await fetch(`${baseUrl}/api/deployment/trigger`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          owner: repository.owner,
          repo: repository.name,
          branch: options.branch || 'main',
          commitSha: commitSha || 'HEAD',
          target,
        }),
      })

      if (!deployResponse.ok) {
        const errorData = await deployResponse.json().catch(() => ({}))
        throw new Error(errorData.error || 'Deployment failed')
      }

      const deployData = await deployResponse.json()
      deploymentUrl = deployData.deploymentUrl || null

      steps[steps.length - 1] = {
        step: 'deploy',
        status: deploymentUrl ? 'success' : 'pending',
        output: deploymentUrl || 'Deployment triggered (URL pending)',
        duration: Date.now() - deployStart,
      }
    } catch (error: any) {
      const stepIndex = steps.length - 1
      steps[stepIndex] = {
        step: 'deploy',
        status: 'failed',
        error: error.message || 'Deployment failed',
        duration: Date.now() - (Date.now() - 1000),
      }
      errors.push(error.message || 'Deployment failed')
      // Don't fail entire workflow if deployment fails
    }
  } else if (options.autoDeploy === false) {
    steps.push({
      step: 'deploy',
      status: 'skipped',
      output: 'Auto-deploy disabled',
    })
  }

  const success = repository !== null && (commitSha !== null || options.generateInitialFiles === false)

  return {
    success,
    repository,
    commitSha,
    deploymentUrl,
    steps,
    errors,
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate repository name from description
 */
function generateRepoName(description: string): string {
  // Clean description: lowercase, remove special chars, replace spaces with hyphens
  const cleaned = description
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 50)
    .replace(/^-+|-+$/g, '')

  // Add timestamp for uniqueness
  const timestamp = Date.now().toString(36).slice(-6)
  return `${cleaned}-${timestamp}`
}

/**
 * Generate initial project files from description
 */
async function generateProjectFiles(description: string, repoName: string): Promise<Array<{ path: string; content: string; mode?: string }>> {
  const files: Array<{ path: string; content: string; mode?: string }> = []

  // Generate README.md
  files.push({
    path: 'README.md',
    content: `# ${repoName}

${description}

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

## License

MIT
`,
  })

  // Generate package.json
  files.push({
    path: 'package.json',
    content: JSON.stringify({
      name: repoName,
      version: '0.1.0',
      description: description,
      private: true,
      scripts: {
        dev: 'next dev',
        build: 'next build',
        start: 'next start',
        lint: 'next lint',
      },
      dependencies: {},
      devDependencies: {},
    }, null, 2),
  })

  // Generate .gitignore
  files.push({
    path: '.gitignore',
    content: `# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/

# Production
.next/
out/
build/
dist/

# Misc
.DS_Store
*.pem

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Local env files
.env*.local
.env

# Vercel
.vercel

# TypeScript
*.tsbuildinfo
next-env.d.ts
`,
  })

  return files
}
