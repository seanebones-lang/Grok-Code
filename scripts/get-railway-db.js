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

const query = {
  query: `
    query {
      project(id: "${projectId}") {
        services {
          edges {
            node {
              id
              name
              serviceType
            }
          }
        }
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
      const services = result?.data?.project?.services?.edges || [];
      
      // Look for PostgreSQL service
      const postgresService = services.find(s => 
        s.node.serviceType === 'POSTGRES' || 
        s.node.name?.toLowerCase().includes('postgres') ||
        s.node.name?.toLowerCase().includes('database')
      );
      
      if (postgresService) {
        console.log(`Found PostgreSQL service: ${postgresService.node.name} (${postgresService.node.id})`);
        console.log(`\nTo get connection string, run:`);
        console.log(`railway variables --service ${postgresService.node.id}`);
      } else {
        console.log('No PostgreSQL service found. Available services:');
        services.forEach(s => {
          console.log(`- ${s.node.name} (${s.node.serviceType || 'unknown'})`);
        });
        console.log('\nTo create PostgreSQL database, visit:');
        console.log(`https://railway.app/project/${projectId}`);
      }
    } catch (e) {
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error(`Error: ${e.message}`);
});

req.write(JSON.stringify(query));
req.end();
