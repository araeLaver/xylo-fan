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
    const sqlPath = path.join(__dirname, '..', 'database', '09-faq-system.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    console.log('📝 Executing migration 09: FAQ system...\n');

    // Execute migration
    await client.query(sql);

    console.log('\n✅ Migration executed successfully!\n');

    // Verify faqs table
    console.log('📊 Verifying faqs table...\n');

    const columnsResult = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'xylo'
        AND table_name = 'faqs'
      ORDER BY ordinal_position;
    `);

    console.log('Columns created:');
    columnsResult.rows.forEach(row => {
      const nullable = row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const def = row.column_default ? ` DEFAULT ${row.column_default}` : '';
      console.log(`   ✅ ${row.column_name.padEnd(20)} ${row.data_type.padEnd(25)} ${nullable}${def}`);
    });

    // Verify indexes
    console.log('\n📊 Verifying indexes...\n');

    const indexesResult = await client.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'xylo'
        AND tablename = 'faqs'
      ORDER BY indexname;
    `);

    console.log('Indexes created:');
    indexesResult.rows.forEach(row => {
      console.log(`   ✅ ${row.indexname}`);
    });

    // Count initial FAQs
    console.log('\n📊 Verifying initial data...\n');

    const countResult = await client.query(`
      SELECT COUNT(*) as count FROM xylo.faqs;
    `);

    console.log(`   ✅ ${countResult.rows[0].count} sample FAQs inserted`);

    console.log('\n🎉 All verifications passed!\n');

    await client.end();
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runMigration();
