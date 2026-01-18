#!/usr/bin/env node

/**
 * Comprehensive Vercel Configuration Verification
 */

const { execSync } = require('child_process');

const TOKEN = process.env.VERCEL_TOKEN;
const PROJECT_NAME = 'nexteleven-code';
const EXPECTED_URL = 'https://nexteleven-code.vercel.app';

if (!TOKEN) {
  console.error('❌ Error: VERCEL_TOKEN environment variable is required');
  console.error('   Set it with: export VERCEL_TOKEN=your_token');
  process.exit(1);
}

function exec(command, silent = false) {
  try {
    return execSync(command, { 
      encoding: 'utf8', 
      stdio: silent ? 'pipe' : 'inherit'
    });
  } catch (error) {
    return null;
  }
}

async function main() {
  console.log('🔍 Comprehensive Vercel Configuration Check\n');
  console.log('='.repeat(60));
  
  // 1. Project Info
  console.log('\n📋 1. PROJECT INFORMATION');
  console.log('-'.repeat(60));
  const projectInfo = exec(`npx vercel project inspect ${PROJECT_NAME} --token ${TOKEN}`, true);
  if (projectInfo) {
    console.log('✅ Project found and accessible');
    const lines = projectInfo.split('\n');
    lines.forEach(line => {
      if (line.includes('ID') || line.includes('Name') || line.includes('Framework')) {
        console.log(`   ${line.trim()}`);
      }
    });
  } else {
    console.log('❌ Could not fetch project info');
  }
  
  // 2. Environment Variables
  console.log('\n🔐 2. ENVIRONMENT VARIABLES');
  console.log('-'.repeat(60));
  const envList = exec(`npx vercel env ls --token ${TOKEN}`, true);
  if (envList) {
    const required = ['GROK_API_KEY', 'GITHUB_ID', 'GITHUB_SECRET', 'NEXTAUTH_SECRET', 'NEXTAUTH_URL', 'DATABASE_URL'];
    const envLines = envList.split('\n');
    const foundVars = new Set();
    
    envLines.forEach(line => {
      required.forEach(varName => {
        if (line.includes(varName)) {
          foundVars.add(varName);
        }
      });
    });
    
    required.forEach(varName => {
      const found = foundVars.has(varName);
      console.log(`   ${found ? '✅' : '❌'} ${varName}`);
    });
    
    // Check NEXTAUTH_URL specifically
    const urlLine = envLines.find(l => l.includes('NEXTAUTH_URL'));
    if (urlLine) {
      console.log(`\n   📍 NEXTAUTH_URL: ${urlLine.includes(EXPECTED_URL) ? '✅ Correct' : '⚠️  May need update'}`);
    }
  }
  
  // 3. Build Configuration
  console.log('\n⚙️  3. BUILD CONFIGURATION');
  console.log('-'.repeat(60));
  const fs = require('fs');
  const vercelJson = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
  console.log(`   ✅ Build Command: ${vercelJson.buildCommand}`);
  console.log(`   ✅ Install Command: ${vercelJson.installCommand}`);
  console.log(`   ✅ Framework: ${vercelJson.framework}`);
  console.log(`   ✅ Output Directory: ${vercelJson.outputDirectory}`);
  
  // 4. Recent Deployments
  console.log('\n🚀 4. RECENT DEPLOYMENTS');
  console.log('-'.repeat(60));
  const deployments = exec(`npx vercel ls --token ${TOKEN}`, true);
  if (deployments) {
    const lines = deployments.split('\n').slice(0, 3);
    lines.forEach(line => {
      if (line.includes('nexteleven') || line.includes('Ready') || line.includes('Production')) {
        console.log(`   ${line.trim()}`);
      }
    });
  }
  
  // 5. Configuration Files
  console.log('\n📁 5. CONFIGURATION FILES');
  console.log('-'.repeat(60));
  const files = ['vercel.json', 'next.config.ts', 'tsconfig.json', 'package.json'];
  files.forEach(file => {
    const exists = fs.existsSync(file);
    console.log(`   ${exists ? '✅' : '❌'} ${file}`);
  });
  
  // 6. Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n✅ Configuration Check Complete!');
  console.log(`\n🌐 Production URL: ${EXPECTED_URL}`);
  console.log('📝 GitHub OAuth callback should be:');
  console.log(`   ${EXPECTED_URL}/api/auth/callback/github\n`);
}

main().catch(console.error);
