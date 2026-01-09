#!/usr/bin/env node

/**
 * Fix Vercel npm authentication issue
 * This script uses Vercel API to check/update project settings
 */

const { execSync } = require('child_process');

function exec(command, options = {}) {
  try {
    return execSync(command, { 
      encoding: 'utf8', 
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options 
    });
  } catch (error) {
    return null;
  }
}

async function main() {
  console.log('🔧 Attempting to fix Vercel npm authentication...\n');
  
  // Get project info
  const projectInfo = exec('npx vercel inspect --json', { silent: true });
  if (projectInfo) {
    try {
      const info = JSON.parse(projectInfo);
      console.log('📋 Project Info:');
      console.log(`   Name: ${info.name || 'N/A'}`);
      console.log(`   URL: ${info.url || 'N/A'}`);
      console.log(`   Project ID: ${info.projectId || 'N/A'}\n`);
    } catch (e) {
      // Ignore
    }
  }
  
  console.log('⚠️  The npm authentication error is a Vercel project setting.');
  console.log('   This needs to be fixed in the Vercel Dashboard.\n');
  
  console.log('📝 Quick Fix Steps:');
  console.log('   1. Go to: https://vercel.com/dashboard');
  console.log('   2. Select your project: grokcode');
  console.log('   3. Go to Settings → General');
  console.log('   4. Scroll to "NPM Registry" section');
  console.log('   5. Remove any npm tokens or clear the registry setting');
  console.log('   6. Save and trigger a new deployment\n');
  
  console.log('🔄 Alternative: Use GitHub Integration');
  console.log('   Since your repo is connected, Vercel will auto-deploy on push.');
  console.log('   The npm token issue might not affect GitHub-triggered builds.\n');
  
  // Try to get the project URL for easier access
  const lsOutput = exec('npx vercel ls --json', { silent: true });
  if (lsOutput) {
    try {
      const projects = JSON.parse(lsOutput);
      if (projects && projects.length > 0) {
        const project = projects[0];
        console.log(`🔗 Direct link to project settings:`);
        console.log(`   https://vercel.com/${project.username || 'sean-mcdonnells-projects-4fbf31ab'}/${project.name || 'grokcode'}/settings\n`);
      }
    } catch (e) {
      // Ignore
    }
  }
}

main().catch(console.error);
