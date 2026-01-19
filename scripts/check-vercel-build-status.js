#!/usr/bin/env node
/**
 * Check Vercel Build Status
 * Fetches latest deployment status to diagnose build failures
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

console.log('🔍 Checking Vercel Build Status...\n');
console.log('='.repeat(70));

// Get latest deployments
const options = {
  hostname: 'api.vercel.com',
  path: `/v13/deployments?projectId=${PROJECT_ID}&teamId=${TEAM_ID}&limit=5&target=production`,
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
      
      if (result.error) {
        console.log('❌ Vercel API Error:', result.error.message);
        return;
      }
      
      const deployments = result.deployments || [];
      
      if (deployments.length === 0) {
        console.log('⚠️  No deployments found');
        return;
      }
      
      console.log(`\n📦 Found ${deployments.length} recent deployment(s):\n`);
      
      deployments.forEach((deployment, index) => {
        const status = deployment.readyState || deployment.state;
        const statusEmoji = status === 'READY' ? '✅' : status === 'ERROR' ? '❌' : '⏳';
        
        console.log(`${index + 1}. ${statusEmoji} ${deployment.meta?.githubCommitMessage || deployment.meta?.gitCommitMessage || 'Deployment'}`);
        console.log(`   State: ${status}`);
        console.log(`   URL: ${deployment.url}`);
        console.log(`   Created: ${new Date(deployment.createdAt).toLocaleString()}`);
        
        if (status === 'ERROR' || status === 'CANCELED') {
          console.log(`   ❌ This deployment failed!`);
          console.log(`   View logs: https://vercel.com/${TEAM_ID}/${deployment.name}/deployments/${deployment.uid}`);
        }
        
        console.log('');
      });
      
      // Get build logs for the latest failed deployment
      const latestFailed = deployments.find(d => (d.readyState || d.state) === 'ERROR');
      
      if (latestFailed) {
        console.log('='.repeat(70));
        console.log('\n🔍 Fetching build logs for latest failed deployment...\n');
        
        getBuildLogs(latestFailed.uid);
      } else {
        const latest = deployments[0];
        if (latest.readyState !== 'READY') {
          console.log('='.repeat(70));
          console.log('\n⏳ Latest deployment is still building...');
          console.log(`   Check status: https://vercel.com/${TEAM_ID}/${latest.name}/deployments/${latest.uid}\n`);
        }
      }
      
    } catch (e) {
      console.error('❌ Error parsing response:', e.message);
      console.log('\nRaw response (first 500 chars):');
      console.log(data.substring(0, 500));
    }
  });
});

function getBuildLogs(deploymentId) {
  const options = {
    hostname: 'api.vercel.com',
    path: `/v2/deployments/${deploymentId}/events?builds=1&functions=1&routes=1`,
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
        const lines = data.split('\n').filter(line => line.trim());
        const errors = lines.filter(line => 
          line.toLowerCase().includes('error') || 
          line.toLowerCase().includes('failed') ||
          line.toLowerCase().includes('build failed')
        );
        
        if (errors.length > 0) {
          console.log('📋 Build Errors Found:\n');
          errors.slice(0, 10).forEach(error => {
            try {
              const json = JSON.parse(error);
              if (json.type === 'command' || json.type === 'stderr') {
                console.log(`   ${json.payload || json.text || ''}`);
              }
            } catch {
              console.log(`   ${error.substring(0, 200)}`);
            }
          });
        } else {
          console.log('⚠️  No error logs found in events');
          console.log('   Check Vercel dashboard for full logs:\n');
          console.log(`   https://vercel.com/${TEAM_ID}/grokcode/deployments/${deploymentId}\n`);
        }
      } catch (e) {
        console.log('Could not parse logs');
        console.log('Check Vercel dashboard directly:\n');
        console.log(`   https://vercel.com/${TEAM_ID}/grokcode/deployments/${deploymentId}\n`);
      }
    });
  });
  
  req.on('error', (e) => {
    console.log('Could not fetch logs');
    console.log(`Check Vercel dashboard: https://vercel.com/${TEAM_ID}/grokcode/deployments/${deploymentId}\n`);
  });
  
  req.end();
}

req.on('error', (e) => {
  console.error('❌ Network error:', e.message);
  console.log('\n💡 Check your internet connection or Vercel API status\n');
});

req.end();
