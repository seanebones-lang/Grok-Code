#!/usr/bin/env node
/**
 * Find Active Railway Backend
 * Tests Railway URLs and identifies the working backend
 */

const https = require('https');

const railwayUrls = [
  'https://grok-code-production.up.railway.app',
  'https://grok-code.railway.app',
  'https://grokcode-production.up.railway.app',
  'https://grokcode.railway.app',
  'https://grok-code.up.railway.app',
  'https://grokcode.up.railway.app',
];

console.log('🔍 Finding Your Active Railway Backend...\n');
console.log('='.repeat(70));

const results = [];

function testUrl(url) {
  return new Promise((resolve) => {
    const testEndpoint = `${url}/api/system/env-status`;
    
    https.get(testEndpoint, { timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const isBackend = res.statusCode === 200 || res.statusCode === 404 || res.statusCode === 405;
        results.push({
          url,
          status: res.statusCode,
          isBackend,
          responded: true,
        });
        resolve();
      });
    }).on('error', (e) => {
      results.push({
        url,
        status: null,
        isBackend: false,
        responded: false,
        error: e.message,
      });
      resolve();
    });
  });
}

async function testAllUrls() {
  console.log('🧪 Testing Railway URLs...\n');
  
  await Promise.all(railwayUrls.map(url => testUrl(url)));
  
  // Filter active backends
  const activeBackends = results.filter(r => r.isBackend);
  
  console.log('='.repeat(70));
  console.log('\n📋 TEST RESULTS:\n');
  
  results.forEach((result, index) => {
    if (result.isBackend) {
      console.log(`✅ ${index + 1}. ${result.url}`);
      console.log(`   Status: ${result.status} - API endpoint responding!\n`);
    } else if (result.responded) {
      console.log(`⚠️  ${index + 1}. ${result.url}`);
      console.log(`   Status: ${result.status} - Not a backend API\n`);
    } else {
      console.log(`❌ ${index + 1}. ${result.url}`);
      console.log(`   Error: ${result.error || 'Not responding'}\n`);
    }
  });
  
  console.log('='.repeat(70));
  
  if (activeBackends.length > 0) {
    console.log('\n🎯 ACTIVE RAILWAY BACKEND URL(S):\n');
    activeBackends.forEach((backend, index) => {
      console.log(`${index + 1}. ${backend.url}`);
      console.log(`   Status Code: ${backend.status}\n`);
    });
    
    // Most likely production backend
    const productionBackend = activeBackends.find(b => b.url.includes('production')) 
      || activeBackends.find(b => b.url.includes('grok-code')) 
      || activeBackends[0];
    
    console.log('='.repeat(70));
    console.log('\n✅ MOST LIKELY YOUR BACKEND:\n');
    console.log(`   ${productionBackend.url}\n`);
    console.log('📋 You can test it by visiting:');
    console.log(`   ${productionBackend.url}/api/system/env-status\n`);
    
    // Save to file for easy reference
    const fs = require('fs');
    fs.writeFileSync('RAILWAY_BACKEND_URL.txt', productionBackend.url);
    console.log('✅ Saved to: RAILWAY_BACKEND_URL.txt\n');
    
  } else {
    console.log('\n⚠️  No active Railway backend found');
    console.log('\n💡 Check Railway Dashboard manually:');
    console.log('   https://railway.app/dashboard\n');
  }
}

testAllUrls();
