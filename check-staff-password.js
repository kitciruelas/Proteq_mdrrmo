const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function checkStaffPassword() {
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

        // Get staff member with email
        const [staff] = await connection.execute(
            "SELECT id, name, email, password FROM staff WHERE email = '22-33950@g.batstate-u.edu.ph'"
        );

        if (staff.length === 0) {
            console.log('❌ Staff member not found');
            return;
        }

        const member = staff[0];
        console.log('Staff member found:');
        console.log(`  ID: ${member.id}`);
        console.log(`  Name: ${member.name}`);
        console.log(`  Email: ${member.email}`);
        console.log(`  Password hash: ${member.password.substring(0, 20)}...`);

        // Test common passwords
        const testPasswords = ['kit123', 'password', '123456', 'admin123', 'KIT1234'];

        console.log('\nTesting common passwords:');
        for (const testPass of testPasswords) {
            try {
                let isValid = false;

                if (member.password.startsWith('$2y$') || member.password.startsWith('$2b$') || member.password.startsWith('$2a$')) {
                    // Hashed password - use bcrypt compare
                    const hashToCompare = member.password.replace(/^\$2y\$/, '$2b$');
                    isValid = await bcrypt.compare(testPass, hashToCompare);
                } else {
                    // Plain text password
                    isValid = testPass === member.password;
                }

                if (isValid) {
                    console.log(`✅ Password match found: "${testPass}"`);
                    return;
                } else {
                    console.log(`❌ "${testPass}" does not match`);
                }
            } catch (error) {
                console.log(`❌ Error testing "${testPass}":`, error.message);
            }
        }

        console.log('\n❌ No matching password found in common passwords');

    } catch (error) {
        console.error('Database error:', error);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

checkStaffPassword();
