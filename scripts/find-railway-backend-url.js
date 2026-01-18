#!/usr/bin/env node
/**
 * Find Railway Backend URL
 * Queries Railway API for services and their public domains
 */

const https = require('https');

const RAILWAY_TOKEN = process.env.RAILWAY_TOKEN;

if (!RAILWAY_TOKEN) {
  console.error('❌ Error: RAILWAY_TOKEN environment variable is required');
  console.error('   Set it with: export RAILWAY_TOKEN=your_token');
  process.exit(1);
}
const PROJECT_ID = process.env.RAILWAY_PROJECT_ID || '080b0df0-f6c7-44c6-861f-c85c8256905b';

console.log('🔍 Finding Railway Backend Deployment URL...\n');
console.log('='.repeat(70));

// Fixed GraphQL query with correct schema
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
              domains {
                edges {
                  node {
                    domain
                    customDomain
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
        console.log('\n❌ Railway API Error:', result.errors[0].message);
        console.log('\n💡 This means:');
        console.log('   - The Railway token may be expired or invalid');
        console.log('   - The project ID might be incorrect');
        console.log('   - You may need to authenticate to Railway\n');
        console.log('📋 MANUAL STEPS TO FIND YOUR BACKEND URL:\n');
        console.log('1. Go to Railway Dashboard:');
        console.log('   https://railway.app/dashboard\n');
        console.log('2. Find your Grok-Code project');
        console.log('3. Click on the service (the one running your backend)');
        console.log('4. Go to "Settings" → "Networking"');
        console.log('5. Look for "Public Domain" or "Custom Domain"');
        console.log('   It will look like: https://your-app-name.up.railway.app\n');
        console.log('ALTERNATIVE: Check your frontend environment variables');
        console.log('   Your Vercel frontend might have the Railway URL stored');
        console.log('   in environment variables (like API_URL, BACKEND_URL, etc.)\n');
        return;
      }

      const project = result?.data?.project;
      if (!project) {
        console.log('\n❌ Project not found');
        console.log('   Check if PROJECT_ID is correct:', PROJECT_ID);
        return;
      }

      console.log(`\n✅ Found Railway Project: ${project.name}`);
      console.log(`   Project ID: ${PROJECT_ID}\n`);
      console.log('🚂 Services and Domains:\n');

      const services = project.services?.edges || [];
      
      if (services.length === 0) {
        console.log('⚠️  No services found in this project');
        console.log('\n💡 You may need to:');
        console.log('   1. Create a service in Railway');
        console.log('   2. Deploy your backend code');
        console.log('   3. Generate a public domain\n');
        return;
      }

      let foundUrl = false;

      for (const serviceEdge of services) {
        const service = serviceEdge.node;
        console.log(`📦 Service: ${service.name || 'Unnamed'}`);
        console.log(`   ID: ${service.id}\n`);
        
        const domains = service.domains?.edges || [];
        
        if (domains.length > 0) {
          console.log('   🌐 Domains:');
          domains.forEach((domainEdge, i) => {
            const domain = domainEdge.node;
            const url = domain.customDomain 
              ? `https://${domain.customDomain}`
              : `https://${domain.domain}`;
            
            console.log(`      ${i + 1}. ${url}`);
            if (domain.customDomain) {
              console.log(`         (Custom Domain)`);
            }
            
            if (!foundUrl) {
              foundUrl = true;
            }
          });
          console.log('');
        } else {
          console.log('   ⚠️  No public domain configured');
          console.log('   💡 Go to Settings → Networking → Generate Domain\n');
        }
      }

      if (foundUrl) {
        console.log('='.repeat(70));
        console.log('\n✅ YOUR RAILWAY BACKEND URL(S) FOUND ABOVE ⬆️\n');
        
        // Test the first domain found
        const firstService = services[0];
        const firstDomain = firstService.node.domains?.edges?.[0];
        if (firstDomain) {
          const testUrl = firstDomain.node.customDomain 
            ? `https://${firstDomain.node.customDomain}`
            : `https://${firstDomain.node.domain}`;
          
          console.log('🧪 Testing backend endpoint...');
          testBackend(testUrl);
        }
      } else {
        console.log('='.repeat(70));
        console.log('\n⚠️  No public domains found for any service');
        console.log('\n📋 TO ENABLE A PUBLIC DOMAIN:\n');
        console.log('1. Go to Railway Dashboard:');
        console.log(`   https://railway.app/project/${PROJECT_ID}\n`);
        console.log('2. Click on your service');
        console.log('3. Go to "Settings" → "Networking"');
        console.log('4. Click "Generate Domain"');
        console.log('5. Copy the generated domain URL\n');
      }
      
    } catch (e) {
      console.error('\n❌ Error parsing response:', e.message);
      console.log('\n💡 Check your Railway Dashboard manually:');
      console.log(`   https://railway.app/project/${PROJECT_ID}\n`);
    }
  });
});

req.on('error', (e) => {
  console.error('\n❌ Network error:', e.message);
  console.log('\n💡 Check your internet connection');
  console.log('   Or check Railway Dashboard manually:');
  console.log(`   https://railway.app/project/${PROJECT_ID}\n`);
});

function testBackend(baseUrl) {
  const testEndpoint = `${baseUrl}/api/system/env-status`;
  
  https.get(testEndpoint, { timeout: 5000 }, (res) => {
    console.log(`   ✅ Backend is responding!`);
    console.log(`   Status: ${res.statusCode}`);
    console.log(`   URL: ${baseUrl}\n`);
  }).on('error', (e) => {
    console.log(`   ⚠️  Could not reach backend: ${e.message}`);
    console.log(`   URL: ${baseUrl}`);
    console.log('   (This might be normal if the service is not running yet)\n');
  });
}

req.write(JSON.stringify(query));
req.end();
