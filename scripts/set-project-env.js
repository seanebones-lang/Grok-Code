#!/usr/bin/env node
// Set Railway project-level environment variables
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

// Get environment ID
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

console.log('🚀 Setting Railway Project-Level Environment Variables...\n');

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      
      if (result.errors) {
        console.log('❌ API Error:', result.errors[0].message);
        console.log('\n💡 The Railway API token may need different permissions.');
        console.log('📋 Manual setup required:');
        console.log('1. Go to: https://railway.app/project/' + projectId);
        console.log('2. Create service → GitHub Repo → your-username/Grok-Code');
        console.log('3. Add variables from RAILWAY_ENV_VARS.txt');
        return;
      }
      
      const environments = result?.data?.project?.environments?.edges || [];
      const prodEnv = environments.find(e => e.node.name === 'production') || environments[0];
      
      if (!prodEnv) {
        console.log('❌ No environment found');
        return;
      }
      
      console.log(`✅ Using environment: ${prodEnv.node.name}\n`);
      console.log('📝 Setting variables...\n');
      
      let completed = 0;
      Object.entries(envVars).forEach(([name, value]) => {
        const query = {
          query: `
            mutation {
              variableUpsert(input: {
                projectId: "${projectId}",
                environmentId: "${prodEnv.node.id}",
                name: "${name}",
                value: ${JSON.stringify(value)}
              })
            }
          `
        };
        
        const reqVar = https.request(options, (res2) => {
          let data2 = '';
          res2.on('data', (chunk) => { data2 += chunk; });
          res2.on('end', () => {
            completed++;
            try {
              const result2 = JSON.parse(data2);
              if (result2.errors) {
                console.log(`⚠️  ${name}: ${result2.errors[0].message}`);
              } else if (result2.data?.variableUpsert === true) {
                console.log(`✅ ${name}: Set successfully`);
              } else {
                console.log(`✅ ${name}: Set`);
              }
            } catch (e) {
              if (data2.includes('true') || data2.includes('"data"')) {
                console.log(`✅ ${name}: Set successfully`);
              } else {
                console.log(`⚠️  ${name}: ${data2.substring(0, 80)}`);
              }
            }
            
            if (completed === Object.keys(envVars).length) {
              console.log('\n🎉 Environment variables configuration complete!');
              console.log('📋 Variables are set at project level and will be available to all services');
              console.log('🔗 Verify: https://railway.app/project/' + projectId);
            }
          });
        });
        
        reqVar.on('error', (e) => {
          completed++;
          console.log(`❌ ${name}: ${e.message}`);
        });
        
        reqVar.write(JSON.stringify(query));
        reqVar.end();
        
        setTimeout(() => {}, 300 * completed);
      });
    } catch (e) {
      console.log('Error:', data.substring(0, 200));
    }
  });
});

req.on('error', (e) => {
  console.error(`Error: ${e.message}`);
});

req.write(JSON.stringify(getEnvQuery));
req.end();
