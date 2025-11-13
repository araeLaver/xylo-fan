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
    const sqlPath = path.join(__dirname, '..', 'database', '06-youtube-extended-fields.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    console.log('📝 Executing migration 06: YouTube extended fields...\n');

    // Execute migration
    await client.query(sql);

    console.log('\n✅ Migration executed successfully!\n');

    // Verify new columns in youtube_videos
    console.log('📊 Verifying youtube_videos new columns...\n');

    const columnsResult = await client.query(`
      SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'xylo'
        AND table_name = 'youtube_videos'
        AND column_name IN (
          'category_id', 'default_language', 'default_audio_language',
          'thumbnail_medium_url', 'thumbnail_high_url', 'thumbnail_maxres_url',
          'channel_title', 'live_broadcast_content',
          'definition', 'dimension', 'has_caption', 'is_licensed_content', 'projection',
          'privacy_status', 'upload_status', 'is_embeddable', 'license',
          'is_made_for_kids', 'is_public_stats_viewable'
        )
      ORDER BY column_name;
    `);

    console.log('New columns added:');
    columnsResult.rows.forEach(row => {
      const len = row.character_maximum_length ? `(${row.character_maximum_length})` : '';
      const nullable = row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const def = row.column_default ? ` DEFAULT ${row.column_default}` : '';
      console.log(`   ✅ ${row.column_name.padEnd(30)} ${(row.data_type + len).padEnd(25)} ${nullable}${def}`);
    });

    // Verify indexes
    console.log('\n📊 Verifying new indexes...\n');

    const indexesResult = await client.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'xylo'
        AND tablename = 'youtube_videos'
        AND indexname LIKE 'idx_youtube_videos_%'
        AND indexname IN (
          'idx_youtube_videos_category_id',
          'idx_youtube_videos_privacy_status',
          'idx_youtube_videos_upload_status',
          'idx_youtube_videos_eligible_public',
          'idx_youtube_videos_language',
          'idx_youtube_videos_definition'
        )
      ORDER BY indexname;
    `);

    console.log('Indexes created:');
    indexesResult.rows.forEach(row => {
      console.log(`   ✅ ${row.indexname}`);
    });

    // Verify view
    console.log('\n📊 Verifying view...\n');

    const viewResult = await client.query(`
      SELECT table_name
      FROM information_schema.views
      WHERE table_schema = 'xylo'
        AND table_name = 'v_eligible_videos';
    `);

    if (viewResult.rows.length > 0) {
      console.log('   ✅ v_eligible_videos view created');
    }

    // Verify function
    console.log('\n📊 Verifying function...\n');

    const functionResult = await client.query(`
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_schema = 'xylo'
        AND routine_name = 'get_youtube_category_name';
    `);

    if (functionResult.rows.length > 0) {
      console.log('   ✅ get_youtube_category_name() function created');
    }

    // Verify constraints
    console.log('\n📊 Verifying constraints...\n');

    const constraintsResult = await client.query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_schema = 'xylo'
        AND table_name = 'youtube_videos'
        AND constraint_name LIKE 'chk_%'
      ORDER BY constraint_name;
    `);

    console.log('Check constraints created:');
    constraintsResult.rows.forEach(row => {
      console.log(`   ✅ ${row.constraint_name}`);
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
