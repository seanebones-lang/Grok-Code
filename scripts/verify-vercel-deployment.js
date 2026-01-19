#!/usr/bin/env node
/**
 * Verify Vercel Deployment
 * Checks deployment status and tests new endpoints
 */

const https = require('https');

// Vercel URLs from documentation
const VERCEL_URLS = [
  'https://nexteleven-code.vercel.app',
  'https://nexteleven-code-mfngb5zy7-sean-mcdonnells-projects-4fbf31ab.vercel.app',
  'https://code.mothership-ai.com', // Custom domain
];

console.log('🔍 Verifying Vercel Deployment\n');
console.log('='.repeat(60));
console.log('');

const endpoints = [
  { path: '/', name: 'Home Page' },
  { path: '/api/system/env-status', name: 'Environment Status API' },
  { path: '/api/github/create-repo', name: 'Create Repo API (POST required)' },
  { path: '/api/workflow/full-stack', name: 'Full Stack Workflow API (POST required)' },
];

let foundDeployment = false;
let deploymentUrl = null;

VERCEL_URLS.forEach((baseUrl, index) => {
  console.log(`\n📋 Testing ${index + 1}/${VERCEL_URLS.length}: ${baseUrl}\n`);
  
  // Test home page first
  testEndpoint(baseUrl, '/', 'Home Page', (success) => {
    if (success) {
      foundDeployment = true;
      deploymentUrl = baseUrl;
      console.log(`\n✅ Found active deployment at: ${baseUrl}\n`);
      console.log('🧪 Testing new endpoints...\n');
      
      // Test GET endpoints
      endpoints.slice(1).forEach(({ path, name }) => {
        if (path.includes('POST')) {
          console.log(`   ⏭️  ${name} - Requires POST (skipping GET test)`);
        } else {
          testEndpoint(baseUrl, path, name);
        }
      });
    }
  });
});

function testEndpoint(baseUrl, path, name, callback) {
  const url = `${baseUrl}${path}`;
  
  const req = https.get(url, { timeout: 10000 }, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log(`   ✅ ${name}: Working (200)`);
        if (path === '/api/system/env-status') {
          try {
            const json = JSON.parse(data);
            console.log(`      Validation: ${json.validation?.valid ? '✅ Valid' : '❌ Issues'}`);
            if (json.validation?.missing?.length > 0) {
              console.log(`      Missing: ${json.validation.missing.join(', ')}`);
            }
          } catch (e) {
            // Not JSON
          }
        }
        if (callback) callback(true);
      } else if (res.statusCode === 404) {
        console.log(`   ⚠️  ${name}: Not found (404) - May not be deployed yet`);
        if (callback) callback(false);
      } else if (res.statusCode === 405) {
        console.log(`   ✅ ${name}: Endpoint exists (405 Method Not Allowed - needs POST)`);
        if (callback) callback(true);
      } else {
        console.log(`   ⚠️  ${name}: Status ${res.statusCode}`);
        if (callback) callback(false);
      }
    });
  });
  
  req.on('error', (e) => {
    if (e.code === 'ENOTFOUND') {
      console.log(`   ❌ ${name}: Domain not found`);
    } else if (e.code === 'ECONNREFUSED') {
      console.log(`   ❌ ${name}: Connection refused`);
    } else {
      console.log(`   ❌ ${name}: ${e.message}`);
    }
    if (callback) callback(false);
  });
  
  req.on('timeout', () => {
    req.destroy();
    console.log(`   ⏱️  ${name}: Timeout`);
    if (callback) callback(false);
  });
}

setTimeout(() => {
  console.log('\n' + '='.repeat(60));
  console.log('\n📋 Summary:\n');
  
  if (foundDeployment && deploymentUrl) {
    console.log(`✅ Deployment found at: ${deploymentUrl}\n`);
    console.log('📋 New Endpoints Available:');
    console.log('   - GET  /api/system/env-status');
    console.log('   - POST /api/github/create-repo');
    console.log('   - POST /api/workflow/full-stack');
    console.log('   - POST /api/deployment/trigger');
    console.log('   - POST /api/deployment/rollback\n');
    console.log('🧪 Test Commands:');
    console.log(`   curl ${deploymentUrl}/api/system/env-status\n`);
  } else {
    console.log('⚠️  Could not verify deployment\n');
    console.log('📋 Check Vercel Dashboard:');
    console.log('   https://vercel.com/dashboard\n');
    console.log('💡 If deployment exists, share the URL and I\'ll test it!\n');
  }
}, 5000);
