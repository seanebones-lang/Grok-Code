#!/usr/bin/env node
// Create Railway service and set environment variables
// Replace placeholder values with your actual credentials

const https = require('https');

const projectId = 'your_railway_project_id';
const token = 'your_railway_token';

const envVars = {
  'GROK_API_KEY': 'your_grok_api_key',
  'GITHUB_ID': 'your_github_oauth_client_id',
  'GITHUB_SECRET': 'your_github_oauth_client_secret',
  'NEXTAUTH_SECRET': 'your_nextauth_secret',
  'DATABASE_URL': 'your_database_url'
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

// Get environment first
const getEnvQuery = {
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

console.log('🔍 Checking Railway project...\n');

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      
      if (result.errors) {
        console.log('❌ Error:', result.errors[0].message);
        console.log('\n💡 Solution: Connect GitHub repo in Railway dashboard:');
        console.log('https://railway.app/project/' + projectId);
        console.log('Click "+ New" → "GitHub Repo" → Select your repo');
        return;
      }
      
      const project = result.data?.project;
      if (!project) {
        console.log('❌ Project not found');
        return;
      }
      
      const environments = project.environments?.edges || [];
      const prodEnv = environments.find(e => e.node.name === 'production') || environments[0];
      
      if (!prodEnv) {
        console.log('❌ No environment found');
        return;
      }
      
      const services = project.services?.edges || [];
      const appService = services.find(s => 
        !s.node.name?.toLowerCase().includes('postgres') &&
        !s.node.name?.toLowerCase().includes('database')
      );
      
      if (appService) {
        console.log(`✅ Found service: ${appService.node.name} (${appService.node.id})`);
        console.log(`✅ Environment: ${prodEnv.node.name} (${prodEnv.node.id})\n`);
        console.log('📝 Setting environment variables...\n');
        
        setVariables(appService.node.id, prodEnv.node.id);
      } else {
        console.log('⚠️  No app service found. Available services:');
        services.forEach(s => {
          console.log(`  - ${s.node.name} (${s.node.serviceType || 'unknown'})`);
        });
        console.log('\n💡 To create a service:');
        console.log('1. Go to: https://railway.app/project/' + projectId);
        console.log('2. Click "+ New" → "GitHub Repo"');
        console.log('3. Select your repository');
        console.log('4. Railway will auto-create the service');
        console.log('5. Then run this script again to set variables');
      }
    } catch (e) {
      console.log('Error:', data.substring(0, 200));
    }
  });
});

function setVariables(serviceId, environmentId) {
  let completed = 0;
  const total = Object.keys(envVars).length;
  
  Object.entries(envVars).forEach(([name, value]) => {
    const query = {
      query: `
        mutation {
          variableUpsert(input: {
            serviceId: "${serviceId}",
            name: "${name}",
            value: ${JSON.stringify(value)}
          })
        }
      `
    };
    
    const reqVar = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        completed++;
        try {
          const result = JSON.parse(data);
          if (result.errors) {
            console.log(`⚠️  ${name}: ${result.errors[0].message}`);
          } else if (result.data?.variableUpsert === true) {
            console.log(`✅ ${name}: Set successfully`);
          } else {
            console.log(`✅ ${name}: Set`);
          }
        } catch (e) {
          if (data.includes('true')) {
            console.log(`✅ ${name}: Set successfully`);
          } else {
            console.log(`⚠️  ${name}: ${data.substring(0, 60)}`);
          }
        }
        
        if (completed === total) {
          console.log('\n🎉 All environment variables configured!');
          console.log('🚀 Railway will automatically redeploy with new variables');
          console.log('🔗 Check deployment: https://railway.app/project/' + projectId);
        }
      });
    });
    
    reqVar.on('error', (e) => {
      completed++;
      console.log(`❌ ${name}: ${e.message}`);
    });
    
    reqVar.write(JSON.stringify(query));
    reqVar.end();
    
    setTimeout(() => {}, 200 * completed);
  });
}

req.on('error', (e) => {
  console.error(`Error: ${e.message}`);
});

req.write(JSON.stringify(getEnvQuery));
req.end();
