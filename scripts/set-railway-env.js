#!/usr/bin/env node
// Set Railway environment variables
// Replace placeholder values with your actual credentials

const https = require('https');

const projectId = 'your_railway_project_id';
const token = 'your_railway_token';

const envVars = {
  'GROK_API_KEY': 'your_grok_api_key',
  'GITHUB_ID': 'your_github_oauth_client_id',
  'GITHUB_SECRET': 'your_github_oauth_client_secret',
  'NEXTAUTH_SECRET': 'your_nextauth_secret',
  'NEXTAUTH_URL': 'https://your-app.up.railway.app',
  'DATABASE_URL': 'your_database_url'
};

// First, get services to find the app service
const getServicesQuery = {
  query: `
    query {
      project(id: "${projectId}") {
        services {
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

const options = {
  hostname: 'backboard.railway.app',
  path: '/graphql/v2',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
};

console.log('🔍 Finding services...');

const req1 = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      const services = result?.data?.project?.services?.edges || [];
      
      // Find the app service (not PostgreSQL)
      const appService = services.find(s => 
        !s.node.name?.toLowerCase().includes('postgres') &&
        !s.node.name?.toLowerCase().includes('database')
      ) || services[0];
      
      if (!appService) {
        console.log('❌ No service found. Create a service first in Railway dashboard.');
        return;
      }
      
      console.log(`✅ Found service: ${appService.node.name} (${appService.node.id})`);
      console.log('📝 Setting environment variables...');
      
      // Set each environment variable
      let completed = 0;
      const total = Object.keys(envVars).length;
      
      Object.entries(envVars).forEach(([key, value]) => {
        const setVarQuery = {
          query: `
            mutation {
              variableUpsert(input: {
                serviceId: "${appService.node.id}",
                name: "${key}",
                value: "${value}"
              }) {
                id
                name
              }
            }
          `
        };
        
        const req2 = https.request(options, (res2) => {
          let data2 = '';
          res2.on('data', (chunk) => { data2 += chunk; });
          res2.on('end', () => {
            completed++;
            try {
              const result2 = JSON.parse(data2);
              if (result2.errors) {
                console.log(`⚠️  ${key}: ${result2.errors[0].message}`);
              } else {
                console.log(`✅ ${key}: Set successfully`);
              }
            } catch (e) {
              console.log(`⚠️  ${key}: Response error`);
            }
            
            if (completed === total) {
              console.log('\n🎉 Environment variables configuration complete!');
            }
          });
        });
        
        req2.on('error', (e) => {
          completed++;
          console.log(`❌ ${key}: ${e.message}`);
        });
        
        req2.write(JSON.stringify(setVarQuery));
        req2.end();
      });
      
    } catch (e) {
      console.log('Error parsing response:', data);
    }
  });
});

req1.on('error', (e) => {
  console.error(`Error: ${e.message}`);
});

req1.write(JSON.stringify(getServicesQuery));
req1.end();
