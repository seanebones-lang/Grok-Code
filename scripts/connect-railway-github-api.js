#!/usr/bin/env node
// Connect existing Railway service to GitHub repo via API

const https = require('https');

const projectId = 'f5e8ff6d-8551-4517-aa51-b0f0517ce110';
const serviceId = 'ffb262a0-298a-4c68-ac53-01f4d20c5401';
const repo = 'seanebones-lang/Grok-Code';
const branch = 'main';

// Get token from Railway CLI config or env
const { execSync } = require('child_process');
let token = process.env.RAILWAY_TOKEN;

if (!token) {
  try {
    // Try to get from Railway CLI config
    const configPath = require('os').homedir() + '/.railway/config.json';
    const fs = require('fs');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      token = config.token;
    }
  } catch (e) {
    console.error('❌ Railway token not found. Please set RAILWAY_TOKEN or login via railway CLI');
    process.exit(1);
  }
}

if (!token) {
  console.error('❌ Railway token required. Run: railway login');
  process.exit(1);
}

const options = {
  hostname: 'backboard.railway.app',
  path: '/graphql/v2',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
};

// Connect GitHub repo to service
const connectRepoQuery = {
  query: `
    mutation {
      serviceConnectRepo(input: {
        serviceId: "${serviceId}",
        repo: "${repo}",
        branch: "${branch}"
      }) {
        id
        name
        source {
          repo
          branch
        }
      }
    }
  `
};

console.log('🔗 Connecting Railway service to GitHub repo...\n');
console.log(`Project: ${projectId}`);
console.log(`Service: ${serviceId}`);
console.log(`Repo: ${repo}`);
console.log(`Branch: ${branch}\n`);

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      if (result.errors) {
        console.log('❌ Error:', result.errors[0].message);
        console.log('\n📋 Manual fix required:');
        console.log('1. Go to: https://railway.com/project/' + projectId + '/service/' + serviceId + '/settings');
        console.log('2. Find "Source" section');
        console.log('3. Click "Connect Repository"');
        console.log('4. Select GitHub → ' + repo);
      } else if (result.data?.serviceUpdate) {
        console.log('✅ Service connected to GitHub!');
        console.log('📝 Service:', result.data.serviceUpdate.name);
        console.log('🔗 Repo:', result.data.serviceUpdate.source.repo);
        console.log('🌿 Branch:', result.data.serviceUpdate.source.branch);
        console.log('\n✅ Railway will now auto-deploy on push to main!');
      } else {
        console.log('Response:', JSON.stringify(result, null, 2));
      }
    } catch (e) {
      console.log('Raw response:', data.substring(0, 500));
    }
  });
});

req.on('error', (e) => {
  console.error(`Error: ${e.message}`);
});

req.write(JSON.stringify(connectRepoQuery));
req.end();
