#!/usr/bin/env node
/**
 * Verify Railway Deployment
 * Checks multiple sources to verify deployment status
 */

const https = require('https');
const { execSync } = require('child_process');

const RAILWAY_TOKEN = process.env.RAILWAY_TOKEN;
if (!RAILWAY_TOKEN) {
  console.error('❌ Error: RAILWAY_TOKEN environment variable is required');
  console.error('   Set it with: export RAILWAY_TOKEN=your_token');
  process.exit(1);
}
const PROJECT_ID = '080b0df0-f6c7-44c6-861f-c85c8256905b';
const GITHUB_REPO = 'seanebones-lang/Grok-Code';

console.log('🔍 Verifying Railway Deployment Status\n');
console.log('='.repeat(60));
console.log('');

// Method 1: Check GitHub Actions
console.log('📋 Method 1: Checking GitHub Actions...\n');
try {
  const workflowUrl = `https://api.github.com/repos/${GITHUB_REPO}/actions/runs?per_page=5`;
  const options = {
    hostname: 'api.github.com',
    path: `/repos/${GITHUB_REPO}/actions/runs?per_page=5`,
    method: 'GET',
    headers: {
      'User-Agent': 'NextEleven-Code/1.0',
      'Accept': 'application/vnd.github.v3+json',
    },
  };

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        const runs = result.workflow_runs || [];
        
        const railwayRuns = runs.filter(run => 
          run.name.includes('Railway') || 
          run.path.includes('railway-deploy') ||
          run.path.includes('deploy.yml')
        );

        if (railwayRuns.length > 0) {
          const latest = railwayRuns[0];
          console.log(`✅ Latest Railway deployment workflow:`);
          console.log(`   Status: ${latest.status}`);
          console.log(`   Conclusion: ${latest.conclusion || 'in_progress'}`);
          console.log(`   Created: ${new Date(latest.created_at).toLocaleString()}`);
          console.log(`   URL: ${latest.html_url}\n`);
          
          if (latest.status === 'completed' && latest.conclusion === 'success') {
            console.log('✅ Deployment workflow completed successfully!\n');
          } else if (latest.status === 'in_progress') {
            console.log('⏳ Deployment is currently in progress...\n');
          } else if (latest.conclusion === 'failure') {
            console.log('❌ Deployment workflow failed. Check logs:\n');
            console.log(`   ${latest.html_url}\n`);
          }
        } else {
          console.log('⚠️  No Railway deployment workflows found\n');
        }
      } catch (e) {
        console.log('⚠️  Could not parse GitHub Actions response\n');
      }
      
      // Continue with other checks
      checkRailwayProject();
    });
  });

  req.on('error', (e) => {
    console.log('⚠️  Could not check GitHub Actions\n');
    checkRailwayProject();
  });

  req.end();
} catch (e) {
  console.log('⚠️  Error checking GitHub Actions\n');
  checkRailwayProject();
}

function checkRailwayProject() {
  console.log('📋 Method 2: Checking Railway Project...\n');
  
  const query = {
    query: `
      query {
        project(id: "${PROJECT_ID}") {
          name
          createdAt
          services {
            edges {
              node {
                id
                name
                createdAt
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
          console.log('⚠️  Railway API Error:', result.errors[0].message);
          console.log('\n💡 This might mean:');
          console.log('   - Project ID is incorrect');
          console.log('   - Token doesn\'t have access');
          console.log('   - Project is in a different workspace\n');
        } else {
          const project = result?.data?.project;
          if (project) {
            console.log(`✅ Railway Project Found: ${project.name}`);
            console.log(`   Created: ${new Date(project.createdAt).toLocaleString()}`);
            
            const services = project.services?.edges || [];
            console.log(`   Services: ${services.length}\n`);
            
            if (services.length > 0) {
              services.forEach((s, i) => {
                console.log(`   ${i + 1}. ${s.node.name || 'Unnamed Service'}`);
                console.log(`      ID: ${s.node.id}`);
                console.log(`      Created: ${new Date(s.node.createdAt).toLocaleString()}\n`);
              });
              
              console.log('📋 To check deployment status:');
              console.log(`   https://railway.app/project/${PROJECT_ID}\n`);
            } else {
              console.log('⚠️  No services found in project');
              console.log('   You may need to create a service first\n');
            }
          }
        }
      } catch (e) {
        console.log('⚠️  Could not parse Railway response\n');
      }
      
      printSummary();
    });
  });

  req.on('error', (e) => {
    console.log('⚠️  Network error connecting to Railway\n');
    printSummary();
  });

  req.write(JSON.stringify(query));
  req.end();
}

function printSummary() {
  console.log('='.repeat(60));
  console.log('\n📋 Summary & Next Steps:\n');
  console.log('1. Check GitHub Actions:');
  console.log(`   https://github.com/${GITHUB_REPO}/actions\n`);
  console.log('2. Check Railway Dashboard:');
  console.log(`   https://railway.app/project/${PROJECT_ID}\n`);
  console.log('3. If deployment succeeded, verify:');
  console.log('   - Migration ran (check build logs)');
  console.log('   - Endpoints are working');
  console.log('   - Database has deployments table\n');
  console.log('4. Test new endpoints:');
  console.log('   - GET /api/system/env-status');
  console.log('   - POST /api/github/create-repo');
  console.log('   - POST /api/workflow/full-stack\n');
}
