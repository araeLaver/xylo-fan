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
    const sqlPath = path.join(__dirname, '..', 'database', '05-verification-and-posting.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    console.log('📝 Executing migration 05: Verification history and X auto-posting...\n');

    // Execute migration
    await client.query(sql);

    console.log('\n✅ Migration executed successfully!\n');

    // Verify new tables
    console.log('📊 Verifying new tables...\n');

    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'xylo'
        AND table_name IN (
          'channel_verification_history',
          'x_post_queue',
          'x_posted_content'
        )
      ORDER BY table_name;
    `);

    console.log('New tables created:');
    tablesResult.rows.forEach(row => {
      console.log(`   ✅ ${row.table_name}`);
    });

    // Verify new columns in youtube_channels
    console.log('\n📊 Verifying youtube_channels enhancements...\n');

    const channelColumnsResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'xylo'
        AND table_name = 'youtube_channels'
        AND column_name IN ('first_registered_at', 'verification_attempts')
      ORDER BY column_name;
    `);

    console.log('New columns in youtube_channels:');
    channelColumnsResult.rows.forEach(row => {
      console.log(`   ✅ ${row.column_name} (${row.data_type}, nullable: ${row.is_nullable})`);
    });

    // Verify new columns in youtube_videos
    console.log('\n📊 Verifying youtube_videos enhancements...\n');

    const videoColumnsResult = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'xylo'
        AND table_name = 'youtube_videos'
        AND column_name = 'is_posted_to_x';
    `);

    console.log('New columns in youtube_videos:');
    videoColumnsResult.rows.forEach(row => {
      console.log(`   ✅ ${row.column_name} (${row.data_type}, nullable: ${row.is_nullable}, default: ${row.column_default})`);
    });

    // Verify triggers
    console.log('\n📊 Verifying triggers...\n');

    const triggersResult = await client.query(`
      SELECT trigger_name, event_object_table
      FROM information_schema.triggers
      WHERE trigger_schema = 'xylo'
        AND trigger_name IN (
          'trg_log_verification',
          'trg_mark_video_posted',
          'trg_x_post_queue_updated_at'
        )
      ORDER BY trigger_name;
    `);

    console.log('Triggers installed:');
    triggersResult.rows.forEach(row => {
      console.log(`   ✅ ${row.trigger_name} on ${row.event_object_table}`);
    });

    // Verify function
    console.log('\n📊 Verifying functions...\n');

    const functionsResult = await client.query(`
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_schema = 'xylo'
        AND routine_name = 'check_channel_verification_eligibility';
    `);

    console.log('Functions created:');
    functionsResult.rows.forEach(row => {
      console.log(`   ✅ ${row.routine_name}()`);
    });

    // Check enum type
    console.log('\n📊 Verifying enum types...\n');

    const enumsResult = await client.query(`
      SELECT t.typname as enum_name,
             string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) as values
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'xylo'
        AND t.typname = 'post_status'
      GROUP BY t.typname;
    `);

    console.log('Enum types created:');
    enumsResult.rows.forEach(row => {
      console.log(`   ✅ ${row.enum_name}: ${row.values}`);
    });

    console.log('\n🎉 All verifications passed!\n');

    await client.end();
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runMigration();
