#!/usr/bin/env node
/**
 * Test Common Railway URL Patterns
 * Tests known Railway URL patterns to find the backend
 */

const https = require('https');

// Common Railway URL patterns found in your codebase
const urlPatterns = [
  'https://grok-code-production.up.railway.app',
  'https://grok-code.railway.app',
  'https://grokcode-production.up.railway.app',
  'https://grokcode.railway.app',
  'https://grok-code.up.railway.app',
  'https://grokcode.up.railway.app',
];

console.log('🔍 Testing Common Railway URL Patterns...\n');
console.log('='.repeat(70));

let foundCount = 0;
let testedCount = 0;

urlPatterns.forEach((url, index) => {
  console.log(`\n${index + 1}. Testing: ${url}`);
  
  // Test root endpoint
  https.get(url, { timeout: 5000 }, (res) => {
    testedCount++;
    console.log(`   ✅ Responding! Status: ${res.statusCode}`);
    
    if (res.statusCode === 200 || res.statusCode === 404 || res.statusCode === 405) {
      foundCount++;
      console.log(`   🌐 This URL is active: ${url}`);
    }
    
    // Test API endpoint
    https.get(`${url}/api/system/env-status`, { timeout: 5000 }, (apiRes) => {
      if (apiRes.statusCode === 200 || apiRes.statusCode === 404 || apiRes.statusCode === 405) {
        console.log(`   ✅ API endpoint responding!`);
        console.log(`   📋 Backend URL Found: ${url}\n`);
        console.log('='.repeat(70));
        console.log('\n🎯 YOUR RAILWAY BACKEND URL:');
        console.log(`   ${url}\n`);
      }
      
      checkComplete();
    }).on('error', (e) => {
      checkComplete();
    });
  }).on('error', (e) => {
    testedCount++;
    console.log(`   ❌ Not responding: ${e.message}`);
    checkComplete();
  });
});

function checkComplete() {
  if (testedCount === urlPatterns.length) {
    console.log('\n' + '='.repeat(70));
    if (foundCount === 0) {
      console.log('\n⚠️  None of the common Railway URLs responded');
      console.log('\n💡 Next Steps:');
      console.log('1. Go to Railway Dashboard:');
      console.log('   https://railway.app/dashboard\n');
      console.log('2. Find your Grok-Code project');
      console.log('3. Click on the service');
      console.log('4. Go to "Settings" → "Networking"');
      console.log('5. Look for "Public Domain"\n');
      console.log('ALTERNATIVE: Your backend might be:');
      console.log('   - Running on Vercel (same as frontend)');
      console.log('   - Not deployed yet');
      console.log('   - Using a different domain name\n');
    } else {
      console.log(`\n✅ Found ${foundCount} active Railway deployment(s) above ⬆️\n`);
    }
  }
}

// Give it a moment to complete
setTimeout(() => {
  if (testedCount < urlPatterns.length) {
    console.log('\n⏳ Still testing URLs...\n');
  }
}, 3000);
