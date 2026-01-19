#!/usr/bin/env node
/**
 * Check Railway ID - Find what this ID refers to
 */

const https = require('https');

const RAILWAY_TOKEN = process.env.RAILWAY_TOKEN;
if (!RAILWAY_TOKEN) {
  console.error('❌ Error: RAILWAY_TOKEN environment variable is required');
  console.error('   Set it with: export RAILWAY_TOKEN=your_token');
  process.exit(1);
}
const ID_TO_CHECK = '05bdf45a-9396-4888-ae47-c439310baaa9';

console.log(`🔍 Checking Railway ID: ${ID_TO_CHECK}\n`);
console.log('='.repeat(60));
console.log('');

// Try as Project ID
console.log('1. Checking as Project ID...\n');
checkAsProject(ID_TO_CHECK);

// Try as Service ID
setTimeout(() => {
  console.log('\n2. Checking as Service ID...\n');
  checkAsService(ID_TO_CHECK);
}, 2000);

// Try as Deployment ID
setTimeout(() => {
  console.log('\n3. Checking as Deployment ID...\n');
  checkAsDeployment(ID_TO_CHECK);
}, 4000);

function checkAsProject(projectId) {
  const query = {
    query: `
      query {
        project(id: "${projectId}") {
          id
          name
          description
          createdAt
          services {
            edges {
              node {
                id
                name
                deployments {
                  edges {
                    node {
                      id
                      status
                      url
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

  makeRequest(query, (result) => {
    if (result.errors) {
      console.log('   ❌ Not a Project ID:', result.errors[0].message);
    } else if (result.data?.project) {
      const project = result.data.project;
      console.log('   ✅ FOUND: This is a Railway PROJECT');
      console.log(`   Name: ${project.name || 'Unnamed'}`);
      console.log(`   ID: ${project.id}`);
      console.log(`   Created: ${new Date(project.createdAt).toLocaleString()}`);
      console.log(`   Services: ${project.services?.edges?.length || 0}`);
      
      if (project.services?.edges?.length > 0) {
        console.log('\n   Services:');
        project.services.edges.forEach((s, i) => {
          const service = s.node;
          console.log(`     ${i + 1}. ${service.name || 'Unnamed'} (${service.id})`);
          
          const deployments = service.deployments?.edges || [];
          if (deployments.length > 0) {
            const latest = deployments[0].node;
            if (latest.url) {
              console.log(`        URL: ${latest.url}`);
            }
          }
        });
      }
      
      console.log(`\n   Dashboard: https://railway.app/project/${project.id}`);
    }
  });
}

function checkAsService(serviceId) {
  const query = {
    query: `
      query {
        service(id: "${serviceId}") {
          id
          name
          project {
            id
            name
          }
          deployments {
            edges {
              node {
                id
                status
                url
                createdAt
              }
            }
          }
        }
      }
    `
  };

  makeRequest(query, (result) => {
    if (result.errors) {
      console.log('   ❌ Not a Service ID:', result.errors[0].message);
    } else if (result.data?.service) {
      const service = result.data.service;
      console.log('   ✅ FOUND: This is a Railway SERVICE');
      console.log(`   Name: ${service.name || 'Unnamed'}`);
      console.log(`   ID: ${service.id}`);
      console.log(`   Project: ${service.project?.name || 'Unknown'} (${service.project?.id || 'N/A'})`);
      
      const deployments = service.deployments?.edges || [];
      if (deployments.length > 0) {
        const latest = deployments[0].node;
        console.log(`\n   Latest Deployment:`);
        console.log(`     Status: ${latest.status}`);
        console.log(`     Created: ${new Date(latest.createdAt).toLocaleString()}`);
        if (latest.url) {
          console.log(`     URL: ${latest.url}`);
        }
      }
      
      console.log(`\n   Project Dashboard: https://railway.app/project/${service.project?.id}`);
    }
  });
}

function checkAsDeployment(deploymentId) {
  const query = {
    query: `
      query {
        deployment(id: "${deploymentId}") {
          id
          status
          url
          createdAt
          service {
            id
            name
            project {
              id
              name
            }
          }
        }
      }
    `
  };

  makeRequest(query, (result) => {
    if (result.errors) {
      console.log('   ❌ Not a Deployment ID:', result.errors[0].message);
      console.log('\n' + '='.repeat(60));
      console.log('\n📋 Summary:');
      console.log(`   ID: ${ID_TO_CHECK}`);
      console.log('   Could not identify as Project, Service, or Deployment');
      console.log('   Check Railway Dashboard manually:');
      console.log(`   https://railway.app/project/${ID_TO_CHECK}`);
      console.log(`   https://railway.app/service/${ID_TO_CHECK}`);
    } else if (result.data?.deployment) {
      const deployment = result.data.deployment;
      console.log('   ✅ FOUND: This is a Railway DEPLOYMENT');
      console.log(`   ID: ${deployment.id}`);
      console.log(`   Status: ${deployment.status}`);
      console.log(`   Created: ${new Date(deployment.createdAt).toLocaleString()}`);
      if (deployment.url) {
        console.log(`   URL: ${deployment.url}`);
      }
      console.log(`\n   Service: ${deployment.service?.name || 'Unknown'} (${deployment.service?.id || 'N/A'})`);
      console.log(`   Project: ${deployment.service?.project?.name || 'Unknown'} (${deployment.service?.project?.id || 'N/A'})`);
      console.log(`\n   Project Dashboard: https://railway.app/project/${deployment.service?.project?.id}`);
    }
  });
}

function makeRequest(query, callback) {
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
        callback(result);
      } catch (e) {
        console.log('   ❌ Parse error');
      }
    });
  });

  req.on('error', (e) => {
    console.log('   ❌ Network error:', e.message);
  });

  req.write(JSON.stringify(query));
  req.end();
}
