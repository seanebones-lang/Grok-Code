#!/usr/bin/env node
/**
 * Verify Vercel Deployment Endpoints
 * Tests all new endpoints on the correct Vercel URL
 */

const https = require('https');

const VERCEL_URL = 'https://grokcode-jejl5n1mg-sean-mcdonnells-projects-4fbf31ab.vercel.app';

console.log('🔍 Verifying Vercel Deployment Endpoints\n');
console.log('='.repeat(60));
console.log(`\n📍 Deployment URL: ${VERCEL_URL}\n`);
console.log('='.repeat(60));
console.log('');

const endpoints = [
  { method: 'GET', path: '/', name: 'Home Page' },
  { method: 'GET', path: '/api/system/env-status', name: 'Environment Status API' },
  { method: 'POST', path: '/api/github/create-repo', name: 'Create Repository API', body: JSON.stringify({ name: 'test-repo', description: 'Test' }) },
  { method: 'POST', path: '/api/workflow/full-stack', name: 'Full Stack Workflow API', body: JSON.stringify({ description: 'Test workflow' }) },
];

let successCount = 0;
let totalTests = 0;

endpoints.forEach((endpoint, index) => {
  totalTests++;
  console.log(`\n${index + 1}. Testing ${endpoint.method} ${endpoint.path}`);
  console.log('   ' + '-'.repeat(50));
  
  const url = `${VERCEL_URL}${endpoint.path}`;
  const options = {
    hostname: url.replace('https://', '').split('/')[0],
    path: endpoint.path,
    method: endpoint.method,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'NextEleven-Verification/1.0',
    },
    timeout: 10000,
  };

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log(`   ✅ Status: 200 OK`);
        successCount++;
        
        if (endpoint.path === '/api/system/env-status') {
          try {
            const json = JSON.parse(data);
            console.log(`   📊 Environment Validation:`);
            console.log(`      Valid: ${json.validation?.valid ? '✅' : '❌'}`);
            if (json.validation?.missing?.length > 0) {
              console.log(`      Missing: ${json.validation.missing.join(', ')}`);
            }
            if (json.validation?.warnings?.length > 0) {
              console.log(`      Warnings: ${json.validation.warnings.length}`);
            }
            console.log(`      Timestamp: ${json.timestamp || 'N/A'}`);
          } catch (e) {
            console.log(`   📄 Response: ${data.substring(0, 100)}...`);
          }
        } else if (endpoint.path === '/api/github/create-repo') {
          try {
            const json = JSON.parse(data);
            if (json.success) {
              console.log(`   ✅ Repository creation endpoint working!`);
            } else {
              console.log(`   ⚠️  Endpoint exists but returned error: ${json.error}`);
            }
          } catch (e) {
            console.log(`   📄 Response: ${data.substring(0, 100)}...`);
          }
        } else {
          console.log(`   📄 Response length: ${data.length} bytes`);
        }
      } else if (res.statusCode === 404) {
        console.log(`   ❌ Status: 404 Not Found`);
        console.log(`   💡 Endpoint may not be deployed yet`);
      } else if (res.statusCode === 405) {
        console.log(`   ✅ Status: 405 Method Not Allowed`);
        console.log(`   ✅ Endpoint exists (requires ${endpoint.method})`);
        successCount++;
      } else if (res.statusCode === 400 || res.statusCode === 401 || res.statusCode === 503) {
        console.log(`   ⚠️  Status: ${res.statusCode}`);
        console.log(`   ✅ Endpoint exists but needs configuration`);
        try {
          const json = JSON.parse(data);
          if (json.error) {
            console.log(`   📝 Error: ${json.error}`);
          }
        } catch (e) {
          // Not JSON
        }
        successCount++; // Endpoint exists, just needs config
      } else {
        console.log(`   ⚠️  Status: ${res.statusCode}`);
        console.log(`   📄 Response: ${data.substring(0, 200)}`);
      }
      
      if (index === endpoints.length - 1) {
        printSummary();
      }
    });
  });

  req.on('error', (e) => {
    if (e.code === 'ENOTFOUND') {
      console.log(`   ❌ Domain not found`);
    } else if (e.code === 'ECONNREFUSED') {
      console.log(`   ❌ Connection refused`);
    } else {
      console.log(`   ❌ Error: ${e.message}`);
    }
    
    if (index === endpoints.length - 1) {
      printSummary();
    }
  });

  req.on('timeout', () => {
    req.destroy();
    console.log(`   ⏱️  Timeout`);
    
    if (index === endpoints.length - 1) {
      printSummary();
    }
  });

  if (endpoint.body) {
    req.write(endpoint.body);
  }
  
  req.end();
});

function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Verification Summary:\n');
  console.log(`   Tests: ${totalTests}`);
  console.log(`   Successful: ${successCount}`);
  console.log(`   Deployment URL: ${VERCEL_URL}\n`);
  
  if (successCount === totalTests) {
    console.log('✅ All endpoints are accessible!\n');
  } else if (successCount > 0) {
    console.log('⚠️  Some endpoints need configuration or deployment\n');
  } else {
    console.log('❌ Endpoints not found - deployment may not include latest code\n');
  }
  
  console.log('📋 Next Steps:');
  console.log('   1. If endpoints return 404, trigger a new Vercel deployment');
  console.log('   2. Check Vercel build logs for any errors');
  console.log('   3. Verify environment variables are set in Vercel\n');
}
