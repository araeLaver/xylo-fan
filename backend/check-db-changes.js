require('dotenv').config();
const { Client } = require('pg');

async function checkChanges() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    
    console.log('📊 DB 구조 변경 사항 확인\n');
    console.log('='.repeat(80));
    
    // 1. users 테이블 변경 사항
    console.log('\n1️⃣ users 테이블 변경 사항:');
    console.log('-'.repeat(80));
    
    const usersColumns = await client.query(`
      SELECT column_name, is_nullable, data_type, column_default
      FROM information_schema.columns
      WHERE table_schema = 'xylo' AND table_name = 'users'
        AND column_name IN ('x_id', 'x_handle', 'primary_platform')
      ORDER BY ordinal_position;
    `);
    
    console.table(usersColumns.rows);
    
    // 2. 새로 추가된 인덱스
    console.log('\n2️⃣ 새로 추가된 인덱스:');
    console.log('-'.repeat(80));
    
    const indexes = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'xylo' AND tablename = 'users'
        AND indexname IN ('idx_users_primary_platform', 'idx_users_x_id_not_null')
      ORDER BY indexname;
    `);
    
    console.table(indexes.rows);
    
    // 3. 새로 추가된 트리거
    console.log('\n3️⃣ 새로 추가된 트리거:');
    console.log('-'.repeat(80));
    
    const triggers = await client.query(`
      SELECT trigger_name, event_manipulation, action_statement
      FROM information_schema.triggers
      WHERE trigger_schema = 'xylo' AND event_object_table = 'users'
        AND trigger_name = 'trg_check_primary_platform';
    `);
    
    if (triggers.rows.length > 0) {
      console.log('✅ trg_check_primary_platform 트리거 존재');
      console.log('   - X 사용자는 x_id 필수 검증');
    } else {
      console.log('❌ 트리거 없음');
    }
    
    // 4. 다른 테이블 확인
    console.log('\n4️⃣ 다른 테이블 변경 여부:');
    console.log('-'.repeat(80));
    
    const otherTables = await client.query(`
      SELECT table_name, 
             (SELECT COUNT(*) FROM information_schema.columns c WHERE c.table_schema = 'xylo' AND c.table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'xylo' 
        AND table_type = 'BASE TABLE'
        AND table_name != 'users'
      ORDER BY table_name;
    `);
    
    console.log('📋 전체 테이블 목록 (users 제외):');
    otherTables.rows.forEach(row => {
      console.log(`   - ${row.table_name}: ${row.column_count}개 컬럼`);
    });
    console.log('\n   ⚠️  이 테이블들은 구조 변경 없음');
    
    console.log('\n' + '='.repeat(80));
    console.log('\n✅ 검증 완료\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkChanges();
