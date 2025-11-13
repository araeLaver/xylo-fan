const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
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

    // 1. Create tables
    console.log('📝 Step 1: Creating tables...\n');
    const createTablesSql = fs.readFileSync(path.join(__dirname, '01-create-tables.sql'), 'utf-8');
    await client.query(createTablesSql);
    console.log('✅ Tables created successfully!\n');

    // 2. Update leaderboard
    console.log('📝 Step 2: Updating leaderboard schema...\n');
    const updateLeaderboardSql = fs.readFileSync(path.join(__dirname, 'update-leaderboard.sql'), 'utf-8');
    await client.query(updateLeaderboardSql);
    console.log('✅ Leaderboard updated successfully!\n');

    // 3. Add channel snapshots
    console.log('📝 Step 3: Adding channel snapshots table...\n');
    const channelSnapshotsSql = fs.readFileSync(path.join(__dirname, '02-add-channel-snapshots.sql'), 'utf-8');
    await client.query(channelSnapshotsSql);
    console.log('✅ Channel snapshots table created successfully!\n');

    // Verify created tables
    console.log('📊 Verifying all tables in xylo schema:\n');
    const result = await client.query(`
      SELECT
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
      FROM pg_tables
      WHERE schemaname = 'xylo'
      ORDER BY tablename;
    `);

    console.table(result.rows);
    console.log(`\n✅ Total tables in xylo schema: ${result.rows.length}`);

  } catch (error) {
    console.error('❌ Error occurred:');
    console.error(error.message);
    if (error.position) {
      console.error(`Error position: ${error.position}`);
    }
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed.');
  }
}

runMigration();
