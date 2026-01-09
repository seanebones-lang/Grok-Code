#!/usr/bin/env node
// Connect GitHub repo to Railway to auto-create service

const https = require('https');

const projectId = '080b0df0-f6c7-44c6-861f-c85c8256905b';
const token = 'a5a4fc54-13b0-4467-b90e-c1512ab9c7fc';
const repo = 'seanebones-lang/Grok-Code';

const options = {
  hostname: 'backboard.railway.app',
  path: '/graphql/v2',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
};

// Try to connect GitHub repo
const connectRepoQuery = {
  query: `
    mutation {
      serviceCreate(input: {
        projectId: "${projectId}",
        source: {
          repo: "${repo}"
        }
      }) {
        id
        name
      }
    }
  `
};

console.log('🚀 Connecting GitHub repo to Railway...\n');

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      if (result.errors) {
        console.log('⚠️  Error:', result.errors[0].message);
        console.log('\n📋 Alternative: Connect via Railway dashboard:');
        console.log('https://railway.app/project/' + projectId);
        console.log('Click "+ New" → "GitHub Repo" → Select "' + repo + '"');
      } else if (result.data?.serviceCreate) {
        console.log('✅ Service created:', result.data.serviceCreate.name);
        console.log('📝 Service ID:', result.data.serviceCreate.id);
        console.log('\n✅ Railway will now deploy automatically!');
        console.log('🔗 Check: https://railway.app/project/' + projectId);
      } else {
        console.log('Response:', data.substring(0, 200));
      }
    } catch (e) {
      console.log('Raw response:', data.substring(0, 300));
    }
  });
});

req.on('error', (e) => {
  console.error(`Error: ${e.message}`);
});

req.write(JSON.stringify(connectRepoQuery));
req.end();
