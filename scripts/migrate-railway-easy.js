#!/usr/bin/env node
/**
 * Easy Railway Migration - Multiple Methods
 * Tries to run migration using available methods
 * No manual steps required if DATABASE_URL is available
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚂 Railway Migration - Easy Mode\n');
console.log('This script will help you run the migration automatically.\n');

// Method 1: Check if DATABASE_URL is in environment
if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('railway')) {
  console.log('✅ Found DATABASE_URL in environment\n');
  runMigrationWithURL(process.env.DATABASE_URL);
  process.exit(0);
}

// Method 2: Check .env.local file
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const dbUrlMatch = envContent.match(/DATABASE_URL=["']?([^"'\n]+)["']?/);
  if (dbUrlMatch && dbUrlMatch[1].includes('railway')) {
    console.log('✅ Found DATABASE_URL in .env.local\n');
    runMigrationWithURL(dbUrlMatch[1]);
    process.exit(0);
  }
}

// Method 3: Try Railway CLI (if linked)
console.log('📋 Attempting Railway CLI method...\n');
try {
  execSync('railway status', { stdio: 'ignore' });
  console.log('✅ Railway project is linked\n');
  console.log('Running migration via Railway CLI...\n');
  execSync('railway run npx prisma migrate deploy', { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  console.log('\n✅ Migration complete!');
  process.exit(0);
} catch (e) {
  console.log('⚠️  Railway CLI not linked or not available\n');
}

// Method 4: Provide instructions
console.log('📋 To complete the migration, you have these options:\n');
console.log('OPTION 1: Get DATABASE_URL from Railway Dashboard (Recommended)');
console.log('---------------------------------------------------------------');
console.log('1. Go to: https://railway.app/dashboard');
console.log('2. Select your Grok-Code project');
console.log('3. Click on your PostgreSQL service (or the service with database)');
console.log('4. Go to "Variables" tab');
console.log('5. Find "DATABASE_URL" or "POSTGRES_URL"');
console.log('6. Copy the value');
console.log('7. Then run:');
console.log('   export DATABASE_URL="your_copied_url_here"');
console.log('   node scripts/run-migration-direct.js\n');

console.log('OPTION 2: Use Railway Dashboard Shell');
console.log('--------------------------------------');
console.log('1. Go to: https://railway.app/dashboard');
console.log('2. Select your Grok-Code project');
console.log('3. Click on your Next.js service');
console.log('4. Go to "Deployments" tab');
console.log('5. Click "Run Command" or "Shell"');
console.log('6. Run: npx prisma migrate deploy\n');

console.log('OPTION 3: If you have DATABASE_URL, run:');
console.log('----------------------------------------');
console.log('export DATABASE_URL="your_railway_database_url"');
console.log('node scripts/run-migration-direct.js\n');

process.exit(1);

function runMigrationWithURL(databaseUrl) {
  console.log('📦 Running migration with provided DATABASE_URL...\n');
  
  // Check if pg is installed
  try {
    require('pg');
  } catch (e) {
    console.log('📦 Installing pg package...\n');
    execSync('npm install pg --save-dev', { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
  }
  
  // Run the direct migration script
  process.env.DATABASE_URL = databaseUrl;
  require('./run-migration-direct.js');
}
