#!/usr/bin/env tsx
/**
 * Monitor Vercel Deployment
 * Uses stored Vercel API token to monitor deployment status
 */

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const VERCEL_TOKEN = (() => {
  const tokenPath = join(process.cwd(), '.vercel-token')
  if (existsSync(tokenPath)) {
    return readFileSync(tokenPath, 'utf8').trim()
  }
  return process.env.VERCEL_TOKEN || null
})()

const PROJECT_ID = 'prj_PwrqmqyzcAbLuTN6vHnK3YfCyAxR'
const BASE_URL = 'https://api.vercel.com'

async function checkDeployment() {
  if (!VERCEL_TOKEN) {
    console.error('❌ Vercel token not found')
    process.exit(1)
  }

  try {
    // Get latest deployments
    const response = await fetch(
      `${BASE_URL}/v6/deployments?projectId=${PROJECT_ID}&limit=1`,
      {
        headers: {
          'Authorization': `Bearer ${VERCEL_TOKEN}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const deployments = data.deployments || []

    if (deployments.length === 0) {
      console.log('⚠️  No deployments found')
      return
    }

    const latest = deployments[0]
    const status = latest.readyState || latest.state
    const url = latest.url || latest.alias?.[0] || 'N/A'

    console.log('\n📊 Latest Deployment Status:')
    console.log(`   URL: https://${url}`)
    console.log(`   Status: ${status}`)
    console.log(`   Created: ${new Date(latest.createdAt || latest.created).toLocaleString()}`)
    
    if (latest.readyState === 'READY' || latest.state === 'READY') {
      console.log('\n✅ Deployment successful!')
      console.log(`   Live at: https://${url}`)
    } else if (latest.readyState === 'ERROR' || latest.state === 'ERROR') {
      console.log('\n❌ Deployment failed!')
      if (latest.errorMessage) {
        console.log(`   Error: ${latest.errorMessage}`)
      }
    } else {
      console.log('\n⏳ Deployment in progress...')
      console.log(`   Check: https://vercel.com/sean-mcdonnells-projects-4fbf31ab/nexteleven-code`)
    }

    return latest
  } catch (error) {
    console.error('❌ Error checking deployment:', error)
    process.exit(1)
  }
}

// Run check
checkDeployment()
