#!/usr/bin/env node

/**
 * Automated Vercel Deployment Script
 * Reads .env.local and deploys with all environment variables
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

function exec(command, options = {}) {
  try {
    return execSync(command, { 
      encoding: 'utf8', 
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options 
    });
  } catch (error) {
    if (!options.silent) {
      console.error(`Error: ${error.message}`);
    }
    throw error;
  }
}

async function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env.local');
  const env = {};
  
  if (fs.existsSync(envPath)) {
    console.log('📋 Reading .env.local...');
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        env[key] = value;
      }
    });
  }
  
  return env;
}

async function setEnvVar(key, value, environment) {
  try {
    exec(`echo "${value}" | npx vercel env add ${key} ${environment}`, { silent: true });
    console.log(`  ✅ Set ${key} for ${environment}`);
    return true;
  } catch (error) {
    console.log(`  ⚠️  Failed to set ${key} for ${environment} (may already exist)`);
    return false;
  }
}

async function main() {
  console.log('🚀 Automated Vercel Deployment\n');
  
  // Load environment variables
  const env = await loadEnvFile();
  
  // Check if logged in
  console.log('🔐 Checking Vercel login...');
  try {
    exec('npx vercel whoami', { silent: true });
  } catch {
    console.log('Please login to Vercel...');
    exec('npx vercel login');
  }
  
  // Deploy
  console.log('\n📦 Deploying to Vercel...');
  let deployOutput;
  try {
    deployOutput = exec('npx vercel --yes', { silent: false });
  } catch (error) {
    console.log('Deployment may have succeeded. Continuing...');
  }
  
  // Get deployment URL
  let deployUrl;
  try {
    // Try to get from recent deployments
    const inspectOutput = exec('npx vercel inspect --json', { silent: true });
    const inspect = JSON.parse(inspectOutput);
    if (inspect?.url) {
      deployUrl = inspect.url;
    }
  } catch {
    try {
      const lsOutput = exec('npx vercel ls --json', { silent: true });
      const projects = JSON.parse(lsOutput);
      if (projects && projects.length > 0) {
        deployUrl = projects[0].url;
      }
    } catch {
      // Try to extract from output - look for Preview URL
      const urlMatches = deployOutput?.match(/https:\/\/[^\s]+\.vercel\.app/g);
      if (urlMatches && urlMatches.length > 0) {
        // Get the preview URL (usually the first one)
        deployUrl = urlMatches[0];
      }
    }
  }
  
  if (!deployUrl) {
    console.log('\n⚠️  Could not determine deployment URL.');
    console.log('Please check Vercel dashboard: https://vercel.com/dashboard');
    process.exit(1);
  }
  
  console.log(`\n✅ Deployment URL: ${deployUrl}\n`);
  
  // Set environment variables
  console.log('🔧 Setting environment variables...\n');
  
  const envVars = {
    GROK_API_KEY: env.GROK_API_KEY,
    GITHUB_ID: env.GITHUB_ID,
    GITHUB_SECRET: env.GITHUB_SECRET,
    NEXTAUTH_SECRET: env.NEXTAUTH_SECRET || '7/Hc59wrbdRcpqUuRzn7FmhsttjGTrvZYIG2G43ms/4=',
    NEXTAUTH_URL: deployUrl,
    DATABASE_URL: env.DATABASE_URL,
    UPSTASH_REDIS_REST_URL: env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: env.UPSTASH_REDIS_REST_TOKEN,
  };
  
  const environments = ['production', 'preview', 'development'];
  
  for (const [key, value] of Object.entries(envVars)) {
    if (!value && key !== 'NEXTAUTH_SECRET') {
      console.log(`  ⏭️  Skipping ${key} (not found in .env.local)`);
      continue;
    }
    
    if (key === 'NEXTAUTH_URL') {
      // Set different URLs for different environments
      await setEnvVar(key, deployUrl, 'production');
      await setEnvVar(key, deployUrl, 'preview');
      await setEnvVar(key, 'http://localhost:3000', 'development');
    } else {
      for (const env of environments) {
        await setEnvVar(key, value, env);
      }
    }
  }
  
  console.log('\n✅ Environment variables set!\n');
  
  console.log('📝 Next steps:');
  console.log(`1. Update GitHub OAuth callback URL to: ${deployUrl}/api/auth/callback/github`);
  console.log('   Visit: https://github.com/settings/developers');
  console.log('   Edit your OAuth App → Update Authorization callback URL\n');
  
  console.log(`2. Set up Vercel Postgres (if not already done):`);
  console.log('   Vercel Dashboard → Storage → Create Database → Postgres');
  console.log('   Then update DATABASE_URL in environment variables\n');
  
  console.log(`🌐 Your app: ${deployUrl}\n`);
  
  rl.close();
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  rl.close();
  process.exit(1);
});
