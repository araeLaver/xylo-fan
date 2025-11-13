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
    const sqlPath = path.join(__dirname, '..', 'database', '07-email-verification.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    console.log('📝 Executing migration 07: Email verification system...\n');

    // Execute migration
    await client.query(sql);

    console.log('\n✅ Migration executed successfully!\n');

    // Verify email_verification_codes table
    console.log('📊 Verifying email_verification_codes table...\n');

    const columnsResult = await client.query(`
      SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'xylo'
        AND table_name = 'email_verification_codes'
      ORDER BY ordinal_position;
    `);

    console.log('Columns created:');
    columnsResult.rows.forEach(row => {
      const len = row.character_maximum_length ? `(${row.character_maximum_length})` : '';
      const nullable = row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const def = row.column_default ? ` DEFAULT ${row.column_default}` : '';
      console.log(`   ✅ ${row.column_name.padEnd(20)} ${(row.data_type + len).padEnd(25)} ${nullable}${def}`);
    });

    // Verify indexes
    console.log('\n📊 Verifying indexes...\n');

    const indexesResult = await client.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'xylo'
        AND tablename = 'email_verification_codes'
      ORDER BY indexname;
    `);

    console.log('Indexes created:');
    indexesResult.rows.forEach(row => {
      console.log(`   ✅ ${row.indexname}`);
    });

    // Verify cleanup function
    console.log('\n📊 Verifying cleanup function...\n');

    const functionResult = await client.query(`
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_schema = 'xylo'
        AND routine_name = 'cleanup_expired_verification_codes';
    `);

    if (functionResult.rows.length > 0) {
      console.log('   ✅ cleanup_expired_verification_codes() function created');
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
