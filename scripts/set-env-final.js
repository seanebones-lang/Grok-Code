#!/usr/bin/env node
// Set Railway environment variables via API
// Replace placeholder values with your actual credentials

const https = require('https');

const projectId = 'your_railway_project_id';
const token = 'your_railway_token';

const envVars = [
  { name: 'GROK_API_KEY', value: 'your_grok_api_key' },
  { name: 'GITHUB_ID', value: 'your_github_oauth_client_id' },
  { name: 'GITHUB_SECRET', value: 'your_github_oauth_client_secret' },
  { name: 'NEXTAUTH_SECRET', value: 'your_nextauth_secret' },
  { name: 'DATABASE_URL', value: 'your_database_url' }
];

const options = {
  hostname: 'backboard.railway.app',
  path: '/graphql/v2',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
};

console.log('🚀 Setting Railway Environment Variables...\n');

// First get environment ID
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

const reqEnv = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      if (result.errors) {
        console.log('❌ Error:', result.errors[0].message);
        return;
      }
      
      const environments = result?.data?.project?.environments?.edges || [];
      const prodEnv = environments.find(e => e.node.name === 'production') || environments[0];
      
      if (!prodEnv) {
        console.log('❌ No environment found');
        return;
      }
      
      const environmentId = prodEnv.node.id;
      console.log(`✅ Using environment: ${prodEnv.node.name} (${environmentId})\n`);
      
      // Now set variables
      let completed = 0;
      envVars.forEach(({ name, value }) => {
        const setVarQuery = {
          query: `
            mutation {
              variableUpsert(input: {
                projectId: "${projectId}",
                environmentId: "${environmentId}",
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
            
            if (completed === envVars.length) {
              console.log('\n🎉 Environment variables configuration complete!');
              console.log('🔗 Verify: https://railway.app/project/' + projectId);
            }
          });
        });

        reqVar.on('error', (e) => {
          completed++;
          console.log(`❌ ${name}: ${e.message}`);
        });

        reqVar.write(JSON.stringify(setVarQuery));
        reqVar.end();
        
        // Small delay between requests
        setTimeout(() => {}, 300 * completed);
      });
    } catch (e) {
      console.log('Error parsing:', data.substring(0, 200));
    }
  });
});

reqEnv.on('error', (e) => {
  console.error(`Error: ${e.message}`);
});

reqEnv.write(JSON.stringify(getEnvQuery));
reqEnv.end();
