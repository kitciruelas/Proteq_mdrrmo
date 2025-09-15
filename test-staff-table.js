const mysql = require('mysql2/promise');

async function testStaffTable() {
    let connection;

    try {
        // Create connection
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'proteq_mdrrmo'
        });

        console.log('Connected to database');

        // Check if staff table exists
        const [tables] = await connection.execute(
            "SHOW TABLES LIKE 'staff'"
        );

        if (tables.length === 0) {
            console.log('❌ Staff table does not exist');
            return;
        }

        console.log('✅ Staff table exists');

        // Get table structure
        const [columns] = await connection.execute(
            "DESCRIBE staff"
        );

        console.log('Staff table structure:');
        columns.forEach(col => {
            console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : ''} ${col.Default ? `DEFAULT ${col.Default}` : ''}`);
        });

        // Get all staff records
        const [staff] = await connection.execute(
            "SELECT id, name, email, status, availability FROM staff LIMIT 10"
        );

        console.log(`\nFound ${staff.length} staff records:`);
        staff.forEach(member => {
            console.log(`  ID: ${member.id}, Name: ${member.name}, Email: ${member.email}, Status: ${member.status}, Availability: ${member.availability}`);
        });

        // Check for specific test email
        const [testStaff] = await connection.execute(
            "SELECT * FROM staff WHERE email = 'kit@gmail.com'"
        );

        if (testStaff.length > 0) {
            console.log('\n✅ Found test staff member:');
            console.log(testStaff[0]);
        } else {
            console.log('\n❌ Test staff member (kit@gmail.com) not found');
        }

    } catch (error) {
        console.error('Database error:', error);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

testStaffTable();
