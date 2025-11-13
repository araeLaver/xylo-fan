require('dotenv').config();
const { Client } = require('pg');

async function checkPostingTables() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Check for posting-related tables
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'xylo'
        AND (
          table_name LIKE '%post%'
          OR table_name LIKE '%tweet%'
          OR table_name LIKE '%x_%'
        )
      ORDER BY table_name;
    `);

    console.log('📊 Posting-related tables in xylo schema:');
    if (tablesResult.rows.length === 0) {
      console.log('   ❌ None found');
    } else {
      tablesResult.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
    }

    // Check youtube_videos table for posting-related columns
    console.log('\n📊 Checking youtube_videos table for posting columns:');
    const columnsResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'xylo'
        AND table_name = 'youtube_videos'
        AND (
          column_name LIKE '%post%'
          OR column_name LIKE '%tweet%'
          OR column_name LIKE '%x_%'
        )
      ORDER BY column_name;
    `);

    if (columnsResult.rows.length === 0) {
      console.log('   ❌ No posting-related columns found');
    } else {
      columnsResult.rows.forEach(row => {
        console.log(`   - ${row.column_name} (${row.data_type}, nullable: ${row.is_nullable})`);
      });
    }

    // Check all tables in xylo schema
    console.log('\n📊 All tables in xylo schema:');
    const allTablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'xylo'
      ORDER BY table_name;
    `);
    allTablesResult.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });

    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkPostingTables();
