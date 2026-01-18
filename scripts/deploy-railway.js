#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');

const projectId = process.env.RAILWAY_PROJECT_ID || '080b0df0-f6c7-44c6-861f-c85c8256905b';
const token = process.env.RAILWAY_TOKEN;

if (!token) {
  console.error('❌ Error: RAILWAY_TOKEN environment variable is required');
  console.error('   Set it with: export RAILWAY_TOKEN=your_token');
  process.exit(1);
}

// Create a service via Railway API
const createServiceQuery = {
  query: `
    mutation {
      serviceCreate(input: {
        projectId: "${projectId}",
        name: "grokcode"
      }) {
        id
        name
      }
    }
  `
};

const options = {
  hostname: 'backboard.railway.app',
  path: '/graphql/v2',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
};

console.log('🚀 Deploying to Railway...');

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      if (result.errors) {
        console.log('Error:', JSON.stringify(result.errors, null, 2));
        console.log('\n💡 Deploy via Railway Dashboard instead:');
        console.log('https://railway.app/project/' + projectId);
      } else {
        console.log('✅ Service created:', result.data);
      }
    } catch (e) {
      console.log('Response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error(`Error: ${e.message}`);
});

req.write(JSON.stringify(createServiceQuery));
req.end();
