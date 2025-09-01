const pool = require('./config/conn');

async function setupActivityLogs() {
  try {
    console.log('🔧 Setting up Activity Logs table...\n');

    // 1. Check if activity_logs table exists
    console.log('1. Checking if activity_logs table exists...');
    const [tables] = await pool.execute("SHOW TABLES LIKE 'activity_logs'");
    
    if (tables.length > 0) {
      console.log('✅ activity_logs table already exists');
      
      // Check table structure
      const [columns] = await pool.execute("DESCRIBE activity_logs");
      console.log('Current table structure:');
      columns.forEach(col => {
        console.log(`  - ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
      
      // Check if table has the correct structure
      const hasCorrectStructure = columns.some(col => col.Field === 'admin_id') && 
                                 columns.some(col => col.Field === 'staff_id') && 
                                 columns.some(col => col.Field === 'general_user_id');
      
      if (hasCorrectStructure) {
        console.log('\n✅ Table structure is correct');
        return;
      } else {
        console.log('\n⚠️  Table structure is outdated, recreating...');
        await pool.execute("DROP TABLE activity_logs");
      }
    }

    // 2. Create the activity_logs table
    console.log('\n2. Creating activity_logs table...');
    
    const createTableSQL = `
      CREATE TABLE activity_logs (
        id INT(11) NOT NULL AUTO_INCREMENT,
        admin_id INT(11) DEFAULT NULL,
        staff_id INT(11) DEFAULT NULL,
        general_user_id INT(11) DEFAULT NULL,
        action VARCHAR(100) NOT NULL,
        details TEXT DEFAULT NULL,
        ip_address VARCHAR(45) DEFAULT NULL,
        user_agent TEXT DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        
        INDEX idx_activity_logs_admin_id (admin_id),
        INDEX idx_activity_logs_staff_id (staff_id),
        INDEX idx_activity_logs_general_user_id (general_user_id),
        INDEX idx_activity_logs_created_at_desc (created_at DESC),
        INDEX idx_activity_logs_action (action)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `;
    
    await pool.execute(createTableSQL);
    console.log('✅ activity_logs table created successfully');

    // 3. Insert sample data to test the table
    console.log('\n3. Inserting sample data...');
    
    try {
      // Check if admin table exists and has data
      const [adminCheck] = await pool.execute("SHOW TABLES LIKE 'admin'");
      if (adminCheck.length > 0) {
        const [adminCount] = await pool.execute("SELECT COUNT(*) as count FROM admin");
        if (adminCount[0].count > 0) {
          await pool.execute(`
            INSERT INTO activity_logs (admin_id, action, details, ip_address, created_at)
            VALUES (1, 'table_created', 'Activity logs table created successfully', '127.0.0.1', NOW())
          `);
          console.log('✅ Sample admin log inserted');
        }
      }
      
      // Check if staff table exists and has data
      const [staffCheck] = await pool.execute("SHOW TABLES LIKE 'staff'");
      if (staffCheck.length > 0) {
        const [staffCount] = await pool.execute("SELECT COUNT(*) as count FROM staff");
        if (staffCount[0].count > 0) {
          await pool.execute(`
            INSERT INTO activity_logs (staff_id, action, details, ip_address, created_at)
            VALUES (1, 'table_created', 'Activity logs table created successfully', '127.0.0.1', NOW())
          `);
          console.log('✅ Sample staff log inserted');
        }
      }
      
      // Check if general_users table exists and has data
      const [userCheck] = await pool.execute("SHOW TABLES LIKE 'general_users'");
      if (userCheck.length > 0) {
        const [userCount] = await pool.execute("SELECT COUNT(*) as count FROM general_users");
        if (userCount[0].count > 0) {
          await pool.execute(`
            INSERT INTO activity_logs (general_user_id, action, details, ip_address, created_at)
            VALUES (1, 'table_created', 'Activity logs table created successfully', '127.0.0.1', NOW())
          `);
          console.log('✅ Sample user log inserted');
        }
      }
      
    } catch (insertError) {
      console.log('⚠️  Could not insert sample data (this is normal if referenced tables are empty):', insertError.message);
    }

    // 4. Verify the table works
    console.log('\n4. Testing table functionality...');
    const [testResult] = await pool.execute('SELECT COUNT(*) as count FROM activity_logs');
    console.log(`✅ Table is working! Total logs: ${testResult[0].count}`);

    // 5. Show table structure
    console.log('\n5. Final table structure:');
    const [finalColumns] = await pool.execute("DESCRIBE activity_logs");
    finalColumns.forEach(col => {
      console.log(`  - ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    console.log('\n🎉 Activity Logs setup completed successfully!');
    console.log('💡 You can now use the activity logs API endpoints.');

  } catch (error) {
    console.error('❌ Error during setup:', error);
  } finally {
    await pool.end();
    console.log('\n🏁 Setup completed');
  }
}

// Run the setup
setupActivityLogs();
