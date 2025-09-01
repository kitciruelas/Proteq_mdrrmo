const pool = require('./config/conn');

async function testActivityLogs() {
  try {
    console.log('🔍 Testing Activity Logs Database Structure...\n');

    // 1. Check if activity_logs table exists
    console.log('1. Checking if activity_logs table exists...');
    const [tables] = await pool.execute("SHOW TABLES LIKE 'activity_logs'");
    
    if (tables.length === 0) {
      console.log('❌ activity_logs table does not exist!');
      console.log('💡 You need to run the SQL migration script first.');
      return;
    }
    
    console.log('✅ activity_logs table exists');

    // 2. Check table structure
    console.log('\n2. Checking table structure...');
    const [columns] = await pool.execute("DESCRIBE activity_logs");
    
    console.log('Current columns:');
    columns.forEach(col => {
      console.log(`  - ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    // 3. Check if new structure is in place
    const hasNewStructure = columns.some(col => col.Field === 'admin_id') && 
                           columns.some(col => col.Field === 'staff_id') && 
                           columns.some(col => col.Field === 'general_user_id');
    
    if (!hasNewStructure) {
      console.log('\n❌ Table still has old structure (user_type, user_id)');
      console.log('💡 You need to run the migration script: backend/sql/update_activity_logs_structure.sql');
      return;
    }
    
    console.log('\n✅ Table has new structure (admin_id, staff_id, general_user_id)');

    // 4. Test inserting a sample log
    console.log('\n3. Testing insert functionality...');
    
    try {
      const [result] = await pool.execute(`
        INSERT INTO activity_logs (admin_id, action, details, created_at)
        VALUES (1, 'test_insert', 'Testing activity logging functionality', NOW())
      `);
      
      console.log('✅ Successfully inserted test log with ID:', result.insertId);
      
      // 5. Verify the insert
      const [logs] = await pool.execute('SELECT * FROM activity_logs WHERE id = ?', [result.insertId]);
      console.log('✅ Retrieved test log:', logs[0]);
      
      // 6. Clean up test data
      await pool.execute('DELETE FROM activity_logs WHERE id = ?', [result.insertId]);
      console.log('✅ Cleaned up test data');
      
    } catch (insertError) {
      console.log('❌ Failed to insert test log:', insertError.message);
      
      if (insertError.code === 'ER_NO_REFERENCED_ROW_2') {
        console.log('💡 Foreign key constraint error - admin with ID 1 does not exist');
        console.log('💡 Try using an existing admin ID or create a test admin first');
      }
    }

    // 7. Check for existing data
    console.log('\n4. Checking existing activity logs...');
    const [existingLogs] = await pool.execute('SELECT COUNT(*) as count FROM activity_logs');
    console.log(`📊 Total activity logs in database: ${existingLogs[0].count}`);

    if (existingLogs[0].count > 0) {
      const [sampleLogs] = await pool.execute(`
        SELECT id, admin_id, staff_id, general_user_id, action, details, created_at 
        FROM activity_logs 
        ORDER BY created_at DESC 
        LIMIT 3
      `);
      
      console.log('\nSample logs:');
      sampleLogs.forEach((log, index) => {
        console.log(`  ${index + 1}. ID: ${log.id}, Action: ${log.action}, Created: ${log.created_at}`);
        if (log.admin_id) console.log(`     Admin ID: ${log.admin_id}`);
        if (log.staff_id) console.log(`     Staff ID: ${log.staff_id}`);
        if (log.general_user_id) console.log(`     User ID: ${log.general_user_id}`);
      });
    }

  } catch (error) {
    console.error('❌ Error during testing:', error);
  } finally {
    await pool.end();
    console.log('\n🏁 Test completed');
  }
}

// Run the test
testActivityLogs();
