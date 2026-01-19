#!/usr/bin/env node
/**
 * Simple Deployment Verification
 * Checks if the app is live and working
 */

const https = require('https');

console.log('🔍 Simple Deployment Verification\n');
console.log('='.repeat(60));
console.log('');

// Common Railway URL patterns to check
const possibleUrls = [
  'https://grok-code-production.up.railway.app',
  'https://grok-code.railway.app',
  'https://grokcode-production.up.railway.app',
  'https://grokcode.railway.app',
];

console.log('📋 Checking common Railway URLs...\n');

let found = false;

possibleUrls.forEach((url, index) => {
  console.log(`Checking ${index + 1}/${possibleUrls.length}: ${url}...`);
  
  const req = https.get(url, { timeout: 5000 }, (res) => {
    if (res.statusCode === 200 || res.statusCode === 404 || res.statusCode === 301 || res.statusCode === 302) {
      console.log(`✅ ${url} is responding! (Status: ${res.statusCode})\n`);
      found = true;
      
      // Test the env-status endpoint
      testEndpoint(`${url}/api/system/env-status`);
    } else {
      console.log(`   Status: ${res.statusCode}\n`);
    }
  });
  
  req.on('error', (e) => {
    if (e.code !== 'ENOTFOUND' && e.code !== 'ECONNREFUSED') {
      console.log(`   Error: ${e.message}\n`);
    }
  });
  
  req.on('timeout', () => {
    req.destroy();
  });
});

setTimeout(() => {
  if (!found) {
    console.log('⚠️  Could not find deployment at common URLs\n');
    console.log('📋 To find your Railway deployment URL:');
    console.log('   1. Go to: https://railway.app/dashboard');
    console.log('   2. Find your Grok-Code project');
    console.log('   3. Click on your service');
    console.log('   4. Go to "Settings" → "Networking"');
    console.log('   5. Copy the domain/URL');
    console.log('   6. Share it here and I\'ll verify it!\n');
  }
}, 3000);

function testEndpoint(url) {
  console.log(`🧪 Testing endpoint: ${url}\n`);
  
  https.get(url, { timeout: 5000 }, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      if (res.statusCode === 200) {
        try {
          const json = JSON.parse(data);
          console.log('✅ Environment Status API is working!');
          console.log(`   Validation: ${json.validation?.valid ? '✅ Valid' : '❌ Invalid'}`);
          if (json.status) {
            console.log('   Required vars:', Object.keys(json.status.required || {}).length);
            console.log('   Optional vars:', Object.keys(json.status.optional || {}).length);
          }
          console.log('');
        } catch (e) {
          console.log('✅ Endpoint responding (not JSON)\n');
        }
      } else {
        console.log(`⚠️  Endpoint status: ${res.statusCode}\n`);
      }
    });
  }).on('error', (e) => {
    console.log(`❌ Endpoint error: ${e.message}\n`);
  });
}
