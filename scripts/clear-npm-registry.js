#!/usr/bin/env node

/**
 * Clear npm registry settings from Vercel project via API
 */

const { execSync } = require('child_process');
const https = require('https');

function exec(command, options = {}) {
  try {
    return execSync(command, { 
      encoding: 'utf8', 
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options 
    });
  } catch (error) {
    if (!options.silent) {
      return error.stdout || error.message;
    }
    return null;
  }
}

async function getVercelToken() {
  // Try to get token from Vercel CLI config
  try {
    const configPath = require('path').join(require('os').homedir(), '.vercel', 'auth.json');
    const fs = require('fs');
    if (fs.existsSync(configPath)) {
      const auth = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return auth.token;
    }
  } catch (e) {
    // Ignore
  }
  
  // Try to get from environment
  return process.env.VERCEL_TOKEN || null;
}

async function updateProjectSettings(projectId, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      // Clear npm registry by setting it to null/empty
      npmRegistry: null,
    });
    
    const options = {
      hostname: 'api.vercel.com',
      path: `/v10/projects/${projectId}`,
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };
    
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(body));
        } else {
          reject(new Error(`API Error: ${res.statusCode} - ${body}`));
        }
      });
    });
    
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('🔧 Attempting to clear npm registry settings...\n');
  
  // Get project ID
  const projectJson = exec('cat .vercel/project.json', { silent: true });
  if (!projectJson) {
    console.log('❌ Could not find project.json. Make sure you\'re in the project directory.');
    process.exit(1);
  }
  
  let projectId;
  try {
    const project = JSON.parse(projectJson);
    projectId = project.projectId;
    console.log(`📋 Project ID: ${projectId}\n`);
  } catch (e) {
    console.log('❌ Could not parse project.json');
    process.exit(1);
  }
  
  // Get token
  const token = await getVercelToken();
  if (!token) {
    console.log('❌ Could not find Vercel token.');
    console.log('   Please set VERCEL_TOKEN environment variable or ensure you\'re logged in.');
    console.log('   You can get a token from: https://vercel.com/account/tokens\n');
    process.exit(1);
  }
  
  try {
    console.log('🔄 Updating project settings...');
    const result = await updateProjectSettings(projectId, token);
    console.log('✅ Project settings updated!\n');
    console.log('🚀 Now trigger a new deployment:\n');
    console.log('   npx vercel --prod\n');
  } catch (error) {
    console.log(`❌ Error: ${error.message}\n`);
    console.log('💡 Alternative: The npm registry setting might need to be cleared');
    console.log('   manually in the Vercel dashboard, or the issue might be resolved');
    console.log('   by ensuring .npmrc doesn\'t have auth tokens.\n');
    process.exit(1);
  }
}

main().catch(console.error);
