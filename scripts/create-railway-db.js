#!/usr/bin/env node

const https = require('https');

const projectId = process.env.RAILWAY_PROJECT_ID || '080b0df0-f6c7-44c6-861f-c85c8256905b';
const token = process.env.RAILWAY_TOKEN;

if (!token) {
  console.error('❌ Error: RAILWAY_TOKEN environment variable is required');
  console.error('   Set it with: export RAILWAY_TOKEN=your_token');
  process.exit(1);
}

const options = {
  hostname: 'backboard.railway.app',
  path: `/graphql/v2`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
};

// First, get the project to find environment
const getProjectQuery = {
  query: `
    query {
      project(id: "${projectId}") {
        id
        environments {
          edges {
            node {
              id
              name
            }
          }
        }
      }
    }
  `
};

console.log('Fetching project details...');

const req1 = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      const environments = result?.data?.project?.environments?.edges || [];
      const productionEnv = environments.find(e => e.node.name === 'production') || environments[0];
      
      if (!productionEnv) {
        console.log('No environment found');
        console.log('Raw:', data);
        return;
      }
      
      console.log(`Using environment: ${productionEnv.node.name} (${productionEnv.node.id})`);
      console.log('\n✅ Project is ready!');
      console.log('\n📋 Next steps:');
      console.log('1. Go to: https://railway.app/project/' + projectId);
      console.log('2. Click "+ New" → "Database" → "Add PostgreSQL"');
      console.log('3. Once created, copy the DATABASE_URL from Variables tab');
      console.log('4. Share it here and I\'ll configure everything!');
      
    } catch (e) {
      console.log('Response:', data);
    }
  });
});

req1.on('error', (e) => {
  console.error(`Error: ${e.message}`);
});

req1.write(JSON.stringify(getProjectQuery));
req1.end();
