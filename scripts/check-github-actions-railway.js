#!/usr/bin/env node
/**
 * Check GitHub Actions for Railway Deployment Info
 * Extracts Railway project/service info from workflow runs
 */

const https = require('https');

const GITHUB_REPO = 'seanebones-lang/Grok-Code';

console.log('🔍 Checking GitHub Actions for Railway Deployment Info...\n');

// Get latest workflow runs
const options = {
  hostname: 'api.github.com',
  path: `/repos/${GITHUB_REPO}/actions/runs?per_page=10`,
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
        run.path.includes('railway')
      );

      if (railwayRuns.length === 0) {
        console.log('⚠️  No Railway deployment workflows found');
        console.log('\n📋 Available workflows:');
        const uniqueWorkflows = [...new Set(runs.map(r => r.name))];
        uniqueWorkflows.forEach(name => console.log(`   - ${name}`));
        return;
      }

      console.log(`✅ Found ${railwayRuns.length} Railway workflow run(s)\n`);
      
      railwayRuns.slice(0, 3).forEach((run, i) => {
        console.log(`${i + 1}. ${run.name}`);
        console.log(`   Status: ${run.status}`);
        console.log(`   Conclusion: ${run.conclusion || 'in_progress'}`);
        console.log(`   Created: ${new Date(run.created_at).toLocaleString()}`);
        console.log(`   URL: ${run.html_url}\n`);
      });

      // Get detailed logs from the latest run
      if (railwayRuns.length > 0) {
        const latest = railwayRuns[0];
        console.log('📋 Checking latest run details...\n');
        getWorkflowLogs(latest.id);
      }

    } catch (e) {
      console.error('❌ Error:', e.message);
    }
  });
});

function getWorkflowLogs(runId) {
  const options = {
    hostname: 'api.github.com',
    path: `/repos/${GITHUB_REPO}/actions/runs/${runId}/jobs`,
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
        const jobs = result.jobs || [];
        
        if (jobs.length > 0) {
          const job = jobs[0];
          console.log(`Job: ${job.name}`);
          console.log(`Status: ${job.status} - ${job.conclusion || 'in_progress'}\n`);
          
          if (job.conclusion === 'failure') {
            console.log('❌ Deployment failed');
            console.log(`\n📋 Check logs: ${job.html_url}`);
            console.log('\n💡 Common issues:');
            console.log('   - Missing RAILWAY_TOKEN secret');
            console.log('   - Missing RAILWAY_SERVICE_ID secret');
            console.log('   - Wrong project ID');
            console.log('   - Railway service not found\n');
          }
        }
      } catch (e) {
        console.log('Could not parse job details');
      }
    });
  });

  req.on('error', (e) => {
    console.log('Could not fetch job details');
  });

  req.end();
}

req.on('error', (e) => {
  console.error('❌ Network error:', e.message);
});

req.end();
