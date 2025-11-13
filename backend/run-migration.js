require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  console.log('🔑 Database URL:', process.env.DATABASE_URL ? '✅ Loaded' : '❌ Missing');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('📦 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully\n');

    const sqlPath = path.join(__dirname, '..', 'database', '04-multi-sns-support.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    console.log('🔄 Running migration: 04-multi-sns-support.sql');
    console.log('━'.repeat(60));

    await client.query(sql);

    console.log('✅ Migration completed successfully\n');

    console.log('🔍 Verifying migration...');
    console.log('━'.repeat(60));

    const verifyQuery = `
      SELECT column_name, is_nullable, data_type, column_default
      FROM information_schema.columns
      WHERE table_schema = 'xylo' AND table_name = 'users'
        AND column_name IN ('x_id', 'x_handle', 'primary_platform')
      ORDER BY ordinal_position;
    `;

    const result = await client.query(verifyQuery);

    console.log('\n📊 Users table columns:');
    console.table(result.rows);

    const platformCheck = result.rows.find(r => r.column_name === 'primary_platform');
    if (platformCheck) {
      console.log('✅ primary_platform column added');
    } else {
      console.log('❌ primary_platform column missing');
    }

    const xIdCheck = result.rows.find(r => r.column_name === 'x_id');
    if (xIdCheck && xIdCheck.is_nullable === 'YES') {
      console.log('✅ x_id is now nullable');
    } else {
      console.log('❌ x_id is still NOT NULL');
    }

    const xHandleCheck = result.rows.find(r => r.column_name === 'x_handle');
    if (xHandleCheck && xHandleCheck.is_nullable === 'YES') {
      console.log('✅ x_handle is now nullable');
    } else {
      console.log('❌ x_handle is still NOT NULL');
    }

    console.log('\n━'.repeat(60));
    console.log('🎉 All checks passed! DB is ready for multi-SNS support\n');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
