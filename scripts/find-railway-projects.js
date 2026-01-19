#!/usr/bin/env node
/**
 * Find All Railway Projects
 * Lists all projects the token has access to
 */

const https = require('https');

const RAILWAY_TOKEN = process.env.RAILWAY_TOKEN;
if (!RAILWAY_TOKEN) {
  console.error('❌ Error: RAILWAY_TOKEN environment variable is required');
  console.error('   Set it with: export RAILWAY_TOKEN=your_token');
  process.exit(1);
}

console.log('🔍 Finding Your Railway Projects...\n');

const query = {
  query: `
    query {
      me {
        projects {
          edges {
            node {
              id
              name
              description
              createdAt
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
        console.log('❌ Railway API Error:', result.errors[0].message);
        console.log('\n💡 The token might not have access, or API changed.');
        console.log('   Check Railway Dashboard: https://railway.app/dashboard\n');
        return;
      }

      const projects = result?.data?.me?.projects?.edges || [];
      
      if (projects.length === 0) {
        console.log('⚠️  No projects found');
        console.log('\n💡 Create a project at: https://railway.app/new\n');
        return;
      }

      console.log(`✅ Found ${projects.length} Railway project(s):\n`);
      console.log('='.repeat(60));
      
      projects.forEach((projectEdge, index) => {
        const project = projectEdge.node;
        const services = project.services?.edges || [];
        
        console.log(`\n${index + 1}. ${project.name || 'Unnamed Project'}`);
        console.log(`   Project ID: ${project.id}`);
        console.log(`   Created: ${new Date(project.createdAt).toLocaleString()}`);
        console.log(`   Services: ${services.length}`);
        
        if (services.length > 0) {
          console.log('   Services:');
          services.forEach((s, i) => {
            console.log(`     - ${s.node.name || 'Unnamed'} (${s.node.id})`);
          });
        }
        
        console.log(`   Dashboard: https://railway.app/project/${project.id}`);
      });
      
      console.log('\n' + '='.repeat(60));
      console.log('\n📋 Which project is for Grok-Code?');
      console.log('   Share the Project ID and I\'ll update all scripts!\n');
      
    } catch (e) {
      console.error('❌ Error parsing response:', e.message);
      console.log('\nRaw response (first 500 chars):');
      console.log(data.substring(0, 500));
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Network error:', e.message);
  console.log('\n💡 Check your internet connection or Railway API status\n');
});

req.write(JSON.stringify(query));
req.end();
