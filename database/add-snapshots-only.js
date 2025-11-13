const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function addSnapshots() {
  const client = new Client({
    host: 'ep-divine-bird-a1f4mly5.ap-southeast-1.pg.koyeb.app',
    port: 5432,
    database: 'unble',
    user: 'unble',
    password: 'npg_1kjV0mhECxqs',
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected!\n');

    console.log('📝 Adding channel_daily_snapshots table...\n');
    const sql = fs.readFileSync(path.join(__dirname, '02-add-channel-snapshots.sql'), 'utf-8');
    await client.query(sql);
    console.log('✅ Table created successfully!\n');

    // Verify
    const result = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'xylo' AND table_name = 'channel_daily_snapshots'
      ORDER BY ordinal_position;
    `);

    console.log('📊 Table columns:');
    console.table(result.rows);

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.end();
    console.log('\n🔌 Connection closed.');
  }
}

addSnapshots();
