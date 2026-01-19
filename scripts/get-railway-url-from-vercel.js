#!/usr/bin/env node
/**
 * Get Railway URL from Vercel Deployments
 * Checks deployment metadata and environment variables
 */

const https = require('https');

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
if (!VERCEL_TOKEN) {
  console.error('❌ Error: VERCEL_TOKEN environment variable is required');
  console.error('   Set it with: export VERCEL_TOKEN=your_token');
  process.exit(1);
}
const PROJECT_ID = 'prj_PwrqmqyzcAbLuTN6vHnK3YfCyAxR';
const TEAM_ID = 'team_jowVDU3Y5C8NgPWPMQzD5tPe';

console.log('🔍 Finding Railway URL from Vercel...\n');

// Get latest deployments
const options = {
  hostname: 'api.vercel.com',
  path: `/v13/deployments?projectId=${PROJECT_ID}&teamId=${TEAM_ID}&limit=5`,
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${VERCEL_TOKEN}`,
    'Content-Type': 'application/json',
  },
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      
      if (result.deployments && result.deployments.length > 0) {
        console.log(`✅ Found ${result.deployments.length} deployment(s)\n`);
        
        const latest = result.deployments[0];
        console.log('📦 Latest Deployment:');
        console.log(`   URL: ${latest.url}`);
        console.log(`   State: ${latest.readyState || latest.state}`);
        console.log(`   Created: ${new Date(latest.createdAt).toLocaleString()}\n`);
        
        // Check environment variables in deployment
        if (latest.env) {
          console.log('🔍 Environment Variables in Deployment:\n');
          Object.keys(latest.env).forEach(key => {
            if (key.toLowerCase().includes('railway') || 
                (typeof latest.env[key] === 'string' && latest.env[key].includes('railway'))) {
              console.log(`   ${key}: ${latest.env[key]}`);
            }
          });
        }
        
        // Get project environment variables
        getProjectEnvVars();
        
      } else if (result.error) {
        console.log('❌ Error:', result.error.message);
        getProjectEnvVars();
      } else {
        console.log('⚠️  No deployments found');
        getProjectEnvVars();
      }
    } catch (e) {
      console.error('❌ Parse error:', e.message);
      getProjectEnvVars();
    }
  });
});

function getProjectEnvVars() {
  console.log('\n🔍 Checking Project Environment Variables...\n');
  
  const options = {
    hostname: 'api.vercel.com',
    path: `/v9/projects/${PROJECT_ID}/env?teamId=${TEAM_ID}`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${VERCEL_TOKEN}`,
    },
  };

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        
        if (result.envs && Array.isArray(result.envs)) {
          console.log(`✅ Found ${result.envs.length} environment variables\n`);
          
          // Look for Railway URL
          const railwayVars = result.envs.filter(e => 
            e.key.toLowerCase().includes('railway') ||
            (e.value && typeof e.value === 'string' && e.value.includes('railway.app'))
          );
          
          if (railwayVars.length > 0) {
            console.log('🚂 Railway URLs Found:\n');
            railwayVars.forEach(v => {
              console.log(`   ${v.key}:`);
              console.log(`      ${v.value}`);
              console.log(`      Environment: ${v.target?.join(', ') || 'all'}\n`);
            });
          } else {
            console.log('⚠️  No Railway URLs found in environment variables\n');
            console.log('📋 Checking DATABASE_URL (might be Railway):\n');
            const dbUrl = result.envs.find(e => e.key === 'DATABASE_URL');
            if (dbUrl && dbUrl.value?.includes('railway')) {
              console.log(`   DATABASE_URL contains Railway: ${dbUrl.value}\n`);
            }
          }
          
          // Show all URL-related vars
          console.log('🌐 All URL Variables:\n');
          result.envs
            .filter(e => e.key.includes('URL') || e.key.includes('url'))
            .forEach(v => {
              const masked = v.value && v.value.length > 50 
                ? v.value.substring(0, 50) + '...' 
                : v.value;
              console.log(`   ${v.key}: ${masked}`);
            });
          
        } else if (result.error) {
          console.log('❌ Error:', result.error.message);
        }
      } catch (e) {
        console.log('Could not parse env vars response');
      }
    });
  });

  req.on('error', (e) => {
    console.log('Error fetching env vars');
  });

  req.end();
}

req.on('error', (e) => {
  console.error('❌ Network error:', e.message);
  getProjectEnvVars();
});

req.end();
