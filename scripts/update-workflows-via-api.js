#!/usr/bin/env node

/**
 * Update GitHub workflow files via API to bypass OAuth App restrictions
 */

const fs = require('fs');
const https = require('https');
const path = require('path');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || 
  (fs.existsSync('.github-token') ? fs.readFileSync('.github-token', 'utf8').trim() : null);

const OWNER = 'seanebones-lang';
const REPO = 'Grok-Code';
const BRANCH = 'main';

if (!GITHUB_TOKEN) {
  console.error('❌ GITHUB_TOKEN not found');
  process.exit(1);
}

async function getFileSHA(filePath) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${OWNER}/${REPO}/contents/${filePath}?ref=${BRANCH}`,
      method: 'GET',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'User-Agent': 'GitHub-Workflow-Updater',
        'Accept': 'application/vnd.github.v3+json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const file = JSON.parse(data);
            resolve(file.sha);
          } catch (e) {
            reject(new Error('Failed to parse response'));
          }
        } else if (res.statusCode === 404) {
          resolve(null); // File doesn't exist yet
        } else {
          reject(new Error(`Failed to get file SHA: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function updateFile(filePath, content, message) {
  const sha = await getFileSHA(filePath);
  const encoded = Buffer.from(content).toString('base64');

  return new Promise((resolve, reject) => {
    const putData = JSON.stringify({
      message,
      content: encoded,
      branch: BRANCH,
      ...(sha ? { sha } : {})
    });

    const options = {
      hostname: 'api.github.com',
      path: `/repos/${OWNER}/${REPO}/contents/${filePath}`,
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'User-Agent': 'GitHub-Workflow-Updater',
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json',
        'Content-Length': Buffer.byteLength(putData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          console.log(`✅ Updated ${filePath}`);
          resolve(JSON.parse(data));
        } else {
          const error = JSON.parse(data);
          reject(new Error(`Failed to update ${filePath}: ${res.statusCode} - ${error.message || data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(putData);
    req.end();
  });
}

async function main() {
  const workflowFiles = [
    '.github/workflows/ci.yml',
    '.github/workflows/railway-deploy.yml'
  ];

  console.log('🔄 Updating workflow files via GitHub API...\n');

  for (const filePath of workflowFiles) {
    const fullPath = path.join(process.cwd(), filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`⏭️  Skipping ${filePath} (not found)`);
      continue;
    }

    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      await updateFile(filePath, content, `Update ${path.basename(filePath)} workflow`);
    } catch (error) {
      console.error(`❌ Error updating ${filePath}:`, error.message);
      
      if (error.message.includes('workflow') || error.message.includes('scope')) {
        console.error('\n⚠️  Token still lacks workflow scope.');
        console.error('Solutions:');
        console.error('1. Create a new Personal Access Token with workflow scope');
        console.error('2. Use GitHub CLI: gh auth refresh --scopes workflow');
        console.error('3. Push workflow files manually via GitHub web interface');
      }
      
      process.exit(1);
    }
  }

  console.log('\n✅ All workflow files updated!');
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
