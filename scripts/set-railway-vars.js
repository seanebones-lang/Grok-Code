#!/usr/bin/env node
// Set Railway environment variables via API

const https = require('https');

const projectId = 'f5e8ff6d-8551-4517-aa51-b0f0517ce110';
const serviceId = 'ffb262a0-298a-4c68-ac53-01f4d20c5401';
const environmentId = 'e7e0765f-46ea-4194-9fa8-bd9920eb0f29';
const token = process.env.RAILWAY_TOKEN;

if (!token) {
  console.error('❌ RAILWAY_TOKEN required');
  process.exit(1);
}

const vars = {
  'NEXTAUTH_URL': 'https://grok-code-production.up.railway.app',
  // Add more vars here as needed
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

console.log('🔧 Setting Railway environment variables...\n');

Object.entries(vars).forEach(([key, value]) => {
  const query = {
    query: `
      mutation {
        variableUpsert(input: {
          serviceId: "${serviceId}",
          name: "${key}",
          value: "${value}"
        }) {
          id
          name
          value
        }
      }
    `
  };

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        if (result.errors) {
          console.log(`⚠️  ${key}: ${result.errors[0].message}`);
        } else if (result.data?.variableUpsert) {
          console.log(`✅ ${key} = ${value.substring(0, 30)}...`);
        }
      } catch (e) {
        console.log(`❌ ${key}: Parse error`);
      }
    });
  });

  req.on('error', (e) => {
    console.error(`❌ ${key}: ${e.message}`);
  });

  req.write(JSON.stringify(query));
  req.end();
});

console.log('\n✅ Variables set!');
