const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runUpdate() {
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
    console.log('🔌 Connecting to PostgreSQL database...');
    await client.connect();
    console.log('✅ Connected successfully!\n');

    // Read SQL file
    const sqlPath = path.join(__dirname, 'update-leaderboard.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    console.log('📝 Updating leaderboard_entries table...\n');
    await client.query(sql);

    console.log('✅ Table updated successfully!\n');

  } catch (error) {
    console.error('❌ Error occurred:');
    console.error(error.message);
    if (error.position) {
      console.error(`Error position: ${error.position}`);
    }
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed.');
  }
}

runUpdate();
