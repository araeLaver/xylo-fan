const { Client } = require('pg');

async function verifyTables() {
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
    await client.connect();
    console.log('✅ Connected to PostgreSQL\n');

    // 1. Check ENUM types
    console.log('📌 ENUM Types:');
    const enums = await client.query(`
      SELECT
        t.typname AS enum_name,
        e.enumlabel AS enum_value
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_namespace n ON t.typnamespace = n.oid
      WHERE n.nspname = 'xylo'
      ORDER BY t.typname, e.enumsortorder;
    `);

    let currentEnum = '';
    enums.rows.forEach(row => {
      if (row.enum_name !== currentEnum) {
        console.log(`\n  ${row.enum_name}:`);
        currentEnum = row.enum_name;
      }
      console.log(`    - ${row.enum_value}`);
    });

    // 2. Check tables
    console.log('\n\n📌 Tables:');
    const tables = await client.query(`
      SELECT
        tablename,
        pg_size_pretty(pg_total_relation_size('xylo.'||tablename)) AS size
      FROM pg_tables
      WHERE schemaname = 'xylo'
      ORDER BY tablename;
    `);

    console.table(tables.rows);

    // 3. Check indexes
    console.log('\n📌 Indexes:');
    const indexes = await client.query(`
      SELECT
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'xylo'
      ORDER BY tablename, indexname;
    `);

    console.log(`Total indexes: ${indexes.rows.length}\n`);
    indexes.rows.forEach(idx => {
      console.log(`${idx.tablename}.${idx.indexname}`);
    });

    // 4. Check triggers
    console.log('\n\n📌 Triggers:');
    const triggers = await client.query(`
      SELECT
        event_object_table AS table_name,
        trigger_name,
        event_manipulation,
        action_timing
      FROM information_schema.triggers
      WHERE trigger_schema = 'xylo'
      ORDER BY event_object_table, trigger_name;
    `);

    console.table(triggers.rows);

    // 5. Check system configs
    console.log('\n📌 System Configs:');
    const configs = await client.query(`
      SELECT key, value, description
      FROM xylo.system_configs
      ORDER BY key;
    `);

    console.table(configs.rows);

    // 6. Sample queries - Verify foreign keys
    console.log('\n📌 Foreign Key Constraints:');
    const fks = await client.query(`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'xylo'
      ORDER BY tc.table_name, kcu.column_name;
    `);

    console.log(`Total foreign keys: ${fks.rows.length}\n`);
    fks.rows.forEach(fk => {
      console.log(`${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
    });

    console.log('\n\n✅ Verification complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

verifyTables();
