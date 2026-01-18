#!/usr/bin/env node
/**
 * Automated Railway Migration Runner
 * Gets DATABASE_URL from Railway API and runs Prisma migrations
 * No manual interaction required
 */

const https = require('https');
const { execSync } = require('child_process');
const path = require('path');

const RAILWAY_TOKEN = process.env.RAILWAY_TOKEN || 'a5a4fc54-13b0-4467-b90e-c1512ab9c7fc';
const PROJECT_ID = '080b0df0-f6c7-44c6-861f-c85c8256905b';

console.log('🚂 Railway Automated Migration Runner\n');
console.log('Fetching database connection from Railway...\n');

// GraphQL query to get project variables
const query = {
  query: `
    query {
      project(id: "${PROJECT_ID}") {
        environments {
          edges {
            node {
              id
              name
              variables {
                edges {
                  node {
                    name
                    value
                  }
                }
              }
            }
          }
        }
        services {
          edges {
            node {
              id
              name
              serviceType
              variables {
                edges {
                  node {
                    name
                    value
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
        console.error('❌ Railway API Error:', result.errors[0].message);
        console.log('\n💡 Alternative: Use the DATABASE_URL from railway-migrate.sh');
        console.log('   Or get it from Railway Dashboard → Variables tab\n');
        
        // Try using the DATABASE_URL from the migrate script as fallback
        const fallbackUrl = 'postgresql://postgres:CanjRuYicmTsBJobrKvDiLsJNwbXGNrK@postgres.railway.internal:5432/railway';
        console.log('🔄 Attempting with fallback DATABASE_URL...\n');
        runMigration(fallbackUrl);
        return;
      }

      // Extract DATABASE_URL from project/environment variables
      let databaseUrl = null;
      
      // Check environment variables
      const environments = result?.data?.project?.environments?.edges || [];
      for (const env of environments) {
        const variables = env.node.variables?.edges || [];
        for (const varEdge of variables) {
          if (varEdge.node.name === 'DATABASE_URL' || varEdge.node.name === 'POSTGRES_URL') {
            databaseUrl = varEdge.node.value;
            console.log(`✅ Found DATABASE_URL in ${env.node.name} environment\n`);
            break;
          }
        }
        if (databaseUrl) break;
      }

      // Check service variables if not found
      if (!databaseUrl) {
        const services = result?.data?.project?.services?.edges || [];
        for (const service of services) {
          const variables = service.node.variables?.edges || [];
          for (const varEdge of variables) {
            if (varEdge.node.name === 'DATABASE_URL' || varEdge.node.name === 'POSTGRES_URL') {
              databaseUrl = varEdge.node.value;
              console.log(`✅ Found DATABASE_URL in ${service.node.name} service\n`);
              break;
            }
          }
          if (databaseUrl) break;
        }
      }

      if (!databaseUrl) {
        console.log('⚠️  DATABASE_URL not found in Railway variables');
        console.log('\n📋 Available options:');
        console.log('1. Get DATABASE_URL from Railway Dashboard → Variables tab');
        console.log('2. Use the fallback URL from railway-migrate.sh');
        console.log('\n🔄 Trying fallback URL...\n');
        const fallbackUrl = 'postgresql://postgres:CanjRuYicmTsBJobrKvDiLsJNwbXGNrK@postgres.railway.internal:5432/railway';
        runMigration(fallbackUrl);
        return;
      }

      // Run migration with found DATABASE_URL
      runMigration(databaseUrl);
      
    } catch (e) {
      console.error('❌ Error parsing Railway response:', e.message);
      console.log('\n🔄 Trying fallback DATABASE_URL from railway-migrate.sh...\n');
      const fallbackUrl = 'postgresql://postgres:CanjRuYicmTsBJobrKvDiLsJNwbXGNrK@postgres.railway.internal:5432/railway';
      runMigration(fallbackUrl);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Network error:', e.message);
  console.log('\n🔄 Trying fallback DATABASE_URL from railway-migrate.sh...\n');
  const fallbackUrl = 'postgresql://postgres:CanjRuYicmTsBJobrKvDiLsJNwbXGNrK@postgres.railway.internal:5432/railway';
  runMigration(fallbackUrl);
});

function runMigration(databaseUrl) {
  console.log('📦 Running Prisma migration...\n');
  console.log(`Database: ${databaseUrl.replace(/:[^:@]+@/, ':****@')}\n`); // Hide password in output
  
  try {
    const projectRoot = path.resolve(__dirname, '..');
    process.chdir(projectRoot);
    
    // Set DATABASE_URL as environment variable (Prisma 7 requirement)
    process.env.DATABASE_URL = databaseUrl;
    
    // Run migration (Prisma 7 reads DATABASE_URL from env)
    const output = execSync(
      `npx prisma migrate deploy`,
      { 
        encoding: 'utf8',
        stdio: 'inherit',
        cwd: projectRoot,
        env: { ...process.env, DATABASE_URL: databaseUrl }
      }
    );
    
    console.log('\n✅ Migration completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Verify deployment is working');
    console.log('2. Test new endpoints:');
    console.log('   - GET /api/system/env-status');
    console.log('   - POST /api/github/create-repo');
    console.log('   - POST /api/workflow/full-stack');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('1. Verify DATABASE_URL is correct and accessible');
    console.log('2. Check Railway PostgreSQL service is running');
    console.log('3. Verify network connectivity to Railway database');
    process.exit(1);
  }
}

req.write(JSON.stringify(query));
req.end();
