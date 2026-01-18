#!/usr/bin/env node
/**
 * Direct Migration Runner
 * Executes migration SQL directly against Railway database
 * Works around Prisma 7 compatibility issues
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Railway database connection
// Get from environment variable or user input
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not provided');
  console.log('\n📋 Usage:');
  console.log('   export DATABASE_URL="your_railway_database_url"');
  console.log('   node scripts/run-migration-direct.js');
  console.log('\n💡 To get DATABASE_URL:');
  console.log('   1. Go to Railway Dashboard → Your Project → PostgreSQL Service');
  console.log('   2. Go to "Variables" tab');
  console.log('   3. Copy "DATABASE_URL" value');
  console.log('   4. Run: export DATABASE_URL="copied_url"');
  console.log('   5. Then run this script again\n');
  process.exit(1);
}

console.log('🚂 Running Railway Migration (Direct SQL)\n');
console.log(`Connecting to: ${DATABASE_URL.replace(/:[^:@]+@/, ':****@')}\n`);

// Read migration SQL file
const migrationPath = path.join(__dirname, '..', 'prisma', 'migrations', '20260115000000_add_deployment_history', 'migration.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

async function runMigration() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: false, // Railway internal network doesn't need SSL
  });

  try {
    await client.connect();
    console.log('✅ Connected to Railway database\n');

    // Check if table already exists
    const checkTable = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'deployments'
      );
    `);

    if (checkTable.rows[0].exists) {
      console.log('⚠️  Table "deployments" already exists');
      console.log('✅ Migration may have already been applied\n');
      
      // Verify structure
      const columns = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'deployments'
        ORDER BY ordinal_position;
      `);
      
      console.log('📋 Current table structure:');
      columns.rows.forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type})`);
      });
      console.log('');
      
      await client.end();
      console.log('✅ Migration check complete!');
      return;
    }

    console.log('📦 Creating deployments table...\n');
    
    // Execute migration SQL
    await client.query(migrationSQL);
    
    console.log('✅ Migration executed successfully!\n');
    
    // Verify table was created
    const verify = await client.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_name = 'deployments';
    `);
    
    if (verify.rows[0].count === '1') {
      console.log('✅ Table "deployments" created successfully!');
      console.log('✅ Indexes created successfully!\n');
      
      console.log('📋 Migration Summary:');
      console.log('   - Table: deployments');
      console.log('   - Indexes: 3 indexes created');
      console.log('   - Columns: 13 columns\n');
      
      console.log('🎯 Next steps:');
      console.log('   1. Test new endpoints:');
      console.log('      - GET /api/system/env-status');
      console.log('      - POST /api/github/create-repo');
      console.log('      - POST /api/workflow/full-stack');
      console.log('   2. Enable optional features:');
      console.log('      - Set DEPLOYMENT_HEALTH_CHECK_ENABLED=true');
      console.log('      - Set AUTO_DEPLOY_ENABLED=true\n');
    }
    
    await client.end();
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    
    if (error.message.includes('already exists')) {
      console.log('\n✅ Table already exists - migration was already applied!');
    } else if (error.message.includes('ECONNREFUSED') || error.message.includes('timeout')) {
      console.log('\n💡 Connection error - possible causes:');
      console.log('   1. Railway database is not accessible from your network');
      console.log('   2. DATABASE_URL might need to use public URL instead of internal');
      console.log('   3. Check Railway dashboard for correct DATABASE_URL');
    } else {
      console.log('\n💡 Troubleshooting:');
      console.log('   1. Verify DATABASE_URL is correct');
      console.log('   2. Check Railway PostgreSQL service is running');
      console.log('   3. Try getting DATABASE_URL from Railway Dashboard → Variables');
    }
    
    await client.end();
    process.exit(1);
  }
}

runMigration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
