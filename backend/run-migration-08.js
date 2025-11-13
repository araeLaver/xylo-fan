require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Read SQL file
    const sqlPath = path.join(__dirname, '..', 'database', '08-tutorial-tracking.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    console.log('📝 Executing migration 08: Tutorial tracking system...\n');

    // Execute migration
    await client.query(sql);

    console.log('\n✅ Migration executed successfully!\n');

    // Verify new columns in users table
    console.log('📊 Verifying users table new columns...\n');

    const columnsResult = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'xylo'
        AND table_name = 'users'
        AND column_name IN ('has_completed_tutorial', 'tutorial_completed_at', 'tutorial_skipped_at')
      ORDER BY column_name;
    `);

    console.log('Columns added:');
    columnsResult.rows.forEach(row => {
      const nullable = row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const def = row.column_default ? ` DEFAULT ${row.column_default}` : '';
      console.log(`   ✅ ${row.column_name.padEnd(30)} ${row.data_type.padEnd(25)} ${nullable}${def}`);
    });

    // Verify index
    console.log('\n📊 Verifying index...\n');

    const indexResult = await client.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'xylo'
        AND tablename = 'users'
        AND indexname = 'idx_users_tutorial_completed';
    `);

    if (indexResult.rows.length > 0) {
      console.log('   ✅ idx_users_tutorial_completed index created');
    }

    console.log('\n🎉 All verifications passed!\n');

    await client.end();
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runMigration();
