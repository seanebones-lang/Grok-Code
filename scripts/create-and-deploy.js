#!/usr/bin/env node
// Create and deploy to Railway
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

// Get environment ID first
const getEnvQuery = {
  query: `
    query {
      project(id: "${projectId}") {
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

console.log('🔍 Getting project environment...');

const req1 = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      const environments = result?.data?.project?.environments?.edges || [];
      const prodEnv = environments.find(e => e.node.name === 'production') || environments[0];
      
      if (!prodEnv) {
        console.log('❌ No environment found');
        console.log('Raw:', data);
        return;
      }
      
      console.log(`✅ Using environment: ${prodEnv.node.name} (${prodEnv.node.id})`);
      
      // Get existing services
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
      
      const req2 = https.request(options, (res2) => {
        let data2 = '';
        res2.on('data', (chunk) => { data2 += chunk; });
        res2.on('end', () => {
          try {
            const result2 = JSON.parse(data2);
            const services = result2?.data?.project?.services?.edges || [];
            
            // Find app service (not postgres)
            let appService = services.find(s => 
              !s.node.name?.toLowerCase().includes('postgres') &&
              !s.node.name?.toLowerCase().includes('database')
            );
            
            if (!appService && services.length > 0) {
              appService = services[0];
            }
            
            if (appService) {
              console.log(`✅ Found service: ${appService.node.name} (${appService.node.id})`);
              setEnvVars(appService.node.id);
            } else {
              console.log('⚠️  No app service found. Setting variables at project level...');
              setEnvVars(null, prodEnv.node.id);
            }
          } catch (e) {
            console.log('Error:', data2);
          }
        });
      });
      
      req2.on('error', (e) => console.error('Error:', e.message));
      req2.write(JSON.stringify(getServicesQuery));
      req2.end();
      
    } catch (e) {
      console.log('Error:', data);
    }
  });
});

function setEnvVars(serviceId, environmentId) {
  console.log('\n📝 Setting environment variables...');
  
  let completed = 0;
  const total = Object.keys(envVars).length;
  
  Object.entries(envVars).forEach(([key, value]) => {
    const setVarQuery = {
      query: serviceId ? `
        mutation {
          variableUpsert(input: {
            serviceId: "${serviceId}",
            name: "${key}",
            value: "${value.replace(/"/g, '\\"')}"
          }) {
            id
            name
          }
        }
      ` : `
        mutation {
          variableUpsert(input: {
            projectId: "${projectId}",
            environmentId: "${environmentId}",
            name: "${key}",
            value: "${value.replace(/"/g, '\\"')}"
          }) {
            id
            name
          }
        }
      `
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        completed++;
        try {
          const result = JSON.parse(data);
          if (result.errors) {
            console.log(`⚠️  ${key}: ${result.errors[0].message}`);
          } else {
            console.log(`✅ ${key}: Set successfully`);
          }
        } catch (e) {
          console.log(`✅ ${key}: Set (response: ${data.substring(0, 50)}...)`);
        }
        
        if (completed === total) {
          console.log('\n🎉 All environment variables configured!');
          console.log('\n📋 Next: Connect GitHub repo in Railway dashboard to deploy');
        }
      });
    });
    
    req.on('error', (e) => {
      completed++;
      console.log(`❌ ${key}: ${e.message}`);
    });
    
    req.write(JSON.stringify(setVarQuery));
    req.end();
  });
}

req1.on('error', (e) => {
  console.error(`Error: ${e.message}`);
});

req1.write(JSON.stringify(getEnvQuery));
req1.end();
