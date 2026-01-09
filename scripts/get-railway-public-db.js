#!/usr/bin/env node

// Railway internal URL: postgresql://postgres:CanjRuYicmTsBJobrKvDiLsJNwbXGNrK@postgres.railway.internal:5432/railway
// We need to convert to public URL

const internalUrl = 'postgresql://postgres:CanjRuYicmTsBJobrKvDiLsJNwbXGNrK@postgres.railway.internal:5432/railway';
const https = require('https');

const projectId = '080b0df0-f6c7-44c6-861f-c85c8256905b';
const token = 'a5a4fc54-13b0-4467-b90e-c1512ab9c7fc';

// Try to get public hostname from Railway
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
              domains {
                edges {
                  node {
                    domain
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

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      const services = result?.data?.project?.services?.edges || [];
      const postgresService = services.find(s => 
        s.node.serviceType === 'POSTGRES' || 
        s.node.name?.toLowerCase().includes('postgres')
      );
      
      if (postgresService) {
        console.log('Found PostgreSQL service:', postgresService.node.name);
        // Railway databases typically use containers-us-west-xxx.railway.app pattern
        // But we can construct it from the service ID or use a common pattern
        console.log('\nFor Railway, the public URL typically uses:');
        console.log('containers-us-west-xxx.railway.app or similar');
        console.log('\nTrying common Railway database hostname patterns...');
      }
      
      // Extract credentials from internal URL
      const match = internalUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
      if (match) {
        const [, user, password, host, port, database] = match;
        console.log('\n📋 Extracted credentials:');
        console.log(`User: ${user}`);
        console.log(`Database: ${database}`);
        console.log(`Port: ${port}`);
        console.log('\n⚠️  Internal hostname:', host);
        console.log('\n💡 Railway databases are typically accessible via:');
        console.log('   containers-us-west-xxx.railway.app (or similar regional hostname)');
        console.log('\n🔧 Try this public URL format:');
        console.log(`postgresql://${user}:${password}@containers-us-west-xxx.railway.app:${port}/${database}`);
        console.log('\nOr check Railway dashboard Variables tab for DATABASE_URL');
      }
    } catch (e) {
      console.log('Could not parse response');
    }
  });
});

req.on('error', (e) => {
  console.error(`Error: ${e.message}`);
});

req.write(JSON.stringify(query));
req.end();
