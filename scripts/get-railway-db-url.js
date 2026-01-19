#!/usr/bin/env node
/**
 * Get Railway DATABASE_URL via API
 * Then automatically run migration
 */

const https = require('https');
const { execSync } = require('child_process');
const path = require('path');

const RAILWAY_TOKEN = process.env.RAILWAY_TOKEN;
if (!RAILWAY_TOKEN) {
  console.error('❌ Error: RAILWAY_TOKEN environment variable is required');
  console.error('   Set it with: export RAILWAY_TOKEN=your_token');
  process.exit(1);
}
const PROJECT_ID = '080b0df0-f6c7-44c6-861f-c85c8256905b';

console.log('🔍 Fetching Railway DATABASE_URL...\n');

// Query to get all variables from project
const query = {
  query: `
    query {
      project(id: "${PROJECT_ID}") {
        environments {
          edges {
            node {
              id
              name
              variables {
                edges {
                  node {
                    name
                  }
                }
              }
            }
          }
        }
        services {
          edges {
            node {
              id
              name
              serviceType
              variables {
                edges {
                  node {
                    name
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
        console.log('⚠️  Railway API returned:', result.errors[0].message);
        console.log('\n💡 The Railway API has limitations for getting variable values.');
        console.log('   For security, Railway doesn\'t expose variable values via API.\n');
        console.log('📋 EASIEST SOLUTION - Use Railway Dashboard:\n');
        console.log('1. Go to: https://railway.app/dashboard');
        console.log('2. Find your Grok-Code project');
        console.log('3. Click on the PostgreSQL service (or your database service)');
        console.log('4. Click "Variables" tab');
        console.log('5. Copy the DATABASE_URL value');
        console.log('6. Paste it here and I\'ll run the migration for you!\n');
        console.log('   Or tell me the DATABASE_URL and I\'ll run it automatically.\n');
        return;
      }

      // Check what services exist
      const services = result?.data?.project?.services?.edges || [];
      console.log('📋 Found services in Railway project:');
      services.forEach(s => {
        console.log(`   - ${s.node.name} (${s.node.serviceType || 'unknown'})`);
      });
      console.log('');

      // Look for PostgreSQL service
      const postgresService = services.find(s => 
        s.node.serviceType === 'POSTGRES' || 
        s.node.name?.toLowerCase().includes('postgres') ||
        s.node.name?.toLowerCase().includes('database') ||
        s.node.name?.toLowerCase().includes('db')
      );

      if (postgresService) {
        console.log(`✅ Found database service: ${postgresService.node.name}`);
        console.log(`   Service ID: ${postgresService.node.id}\n`);
        console.log('📋 To get DATABASE_URL:');
        console.log(`   1. Go to: https://railway.app/project/${PROJECT_ID}`);
        console.log(`   2. Click on "${postgresService.node.name}" service`);
        console.log('   3. Go to "Variables" tab');
        console.log('   4. Copy "DATABASE_URL" or "POSTGRES_URL" value');
        console.log('   5. Share it here and I\'ll run the migration!\n');
      } else {
        console.log('⚠️  No PostgreSQL service found in project');
        console.log('   You may need to create a PostgreSQL database first.\n');
      }

    } catch (e) {
      console.log('⚠️  Could not parse Railway response');
      console.log('📋 Please get DATABASE_URL manually from Railway Dashboard\n');
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Error:', e.message);
  console.log('\n📋 Please get DATABASE_URL from Railway Dashboard manually\n');
});

req.write(JSON.stringify(query));
req.end();
