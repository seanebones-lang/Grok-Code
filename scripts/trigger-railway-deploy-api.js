#!/usr/bin/env node
// Trigger Railway deployment via API

const https = require('https');

const projectId = 'f5e8ff6d-8551-4517-aa51-b0f0517ce110';
const serviceId = 'ffb262a0-298a-4c68-ac53-01f4d20c5401';
const token = process.env.RAILWAY_TOKEN || 'c268b0c8-3d4f-4d62-a9e5-1ab006249125';

const options = {
  hostname: 'backboard.railway.app',
  path: '/graphql/v2',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
};

// Trigger deployment
const deployQuery = {
  query: `
    mutation {
      deploymentTrigger(input: {
        serviceId: "${serviceId}"
      }) {
        id
        status
      }
    }
  `
};

console.log('🚀 Triggering Railway deployment...\n');

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      if (result.errors) {
        console.log('❌ Error:', result.errors[0].message);
        console.log('\n📋 Full response:', JSON.stringify(result, null, 2));
      } else if (result.data?.deploymentTrigger) {
        console.log('✅ Deployment triggered!');
        console.log('📝 Deployment ID:', result.data.deploymentTrigger.id);
        console.log('📊 Status:', result.data.deploymentTrigger.status);
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

req.write(JSON.stringify(deployQuery));
req.end();
