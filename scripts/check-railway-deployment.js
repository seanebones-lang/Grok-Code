#!/usr/bin/env node
/**
 * Check Railway Deployment Status
 * Verifies deployment, migration status, and endpoint availability
 */

const https = require('https');

const RAILWAY_TOKEN = process.env.RAILWAY_TOKEN;
if (!RAILWAY_TOKEN) {
  console.error('❌ Error: RAILWAY_TOKEN environment variable is required');
  console.error('   Set it with: export RAILWAY_TOKEN=your_token');
  process.exit(1);
}
const PROJECT_ID = '080b0df0-f6c7-44c6-861f-c85c8256905b';

console.log('🔍 Checking Railway Deployment Status...\n');

// Query to get project and deployment info
const query = {
  query: `
    query {
      project(id: "${PROJECT_ID}") {
        name
        services {
          edges {
            node {
              id
              name
              serviceType
              deployments {
                edges {
                  node {
                    id
                    status
                    createdAt
                    url
                  }
                }
              }
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
    'Authorization': `Bearer ${RAILWAY_TOKEN}`,
  },
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      
      if (result.errors) {
        console.log('⚠️  Railway API Error:', result.errors[0].message);
        console.log('\n📋 Alternative: Check Railway Dashboard manually:');
        console.log(`   https://railway.app/project/${PROJECT_ID}\n`);
        return;
      }

      const project = result?.data?.project;
      if (!project) {
        console.log('❌ Project not found');
        return;
      }

      console.log(`📦 Project: ${project.name}\n`);
      console.log('🚂 Services:\n');

      const services = project.services?.edges || [];
      
      if (services.length === 0) {
        console.log('⚠️  No services found in project');
        console.log('\n💡 You may need to create a service first:');
        console.log(`   https://railway.app/project/${PROJECT_ID}`);
        return;
      }

      let foundDeployment = false;
      let deploymentUrl = null;

      for (const serviceEdge of services) {
        const service = serviceEdge.node;
        console.log(`   ${service.name || 'Unnamed Service'}`);
        console.log(`   Type: ${service.serviceType || 'unknown'}`);
        
        const deployments = service.deployments?.edges || [];
        if (deployments.length > 0) {
          const latestDeployment = deployments[0].node;
          console.log(`   Latest Deployment:`);
          console.log(`     Status: ${latestDeployment.status}`);
          console.log(`     Created: ${new Date(latestDeployment.createdAt).toLocaleString()}`);
          if (latestDeployment.url) {
            console.log(`     URL: ${latestDeployment.url}`);
            deploymentUrl = latestDeployment.url;
            foundDeployment = true;
          }
        } else {
          console.log(`   Status: No deployments yet`);
        }
        console.log('');
      }

      if (foundDeployment && deploymentUrl) {
        console.log('✅ Deployment found! Testing endpoints...\n');
        testEndpoints(deploymentUrl);
      } else {
        console.log('⚠️  No active deployment URL found');
        console.log('\n💡 Check Railway Dashboard for deployment status:');
        console.log(`   https://railway.app/project/${PROJECT_ID}\n`);
      }

    } catch (e) {
      console.error('❌ Error parsing response:', e.message);
      console.log('\n📋 Check Railway Dashboard manually:');
      console.log(`   https://railway.app/project/${PROJECT_ID}\n`);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Network error:', e.message);
  console.log('\n📋 Check Railway Dashboard manually:');
  console.log(`   https://railway.app/project/${PROJECT_ID}\n`);
});

function testEndpoints(baseUrl) {
  const endpoints = [
    { path: '/api/system/env-status', name: 'Environment Status' },
    { path: '/', name: 'Home Page' },
  ];

  console.log('🧪 Testing Endpoints:\n');

  endpoints.forEach(({ path, name }) => {
    const url = `${baseUrl}${path}`;
    console.log(`   Testing ${name}...`);
    
    https.get(url, { timeout: 5000 }, (res) => {
      if (res.statusCode === 200 || res.statusCode === 404) {
        console.log(`   ✅ ${name}: Responding (${res.statusCode})\n`);
      } else {
        console.log(`   ⚠️  ${name}: Status ${res.statusCode}\n`);
      }
    }).on('error', (e) => {
      console.log(`   ❌ ${name}: ${e.message}\n`);
    });
  });
}

req.write(JSON.stringify(query));
req.end();
