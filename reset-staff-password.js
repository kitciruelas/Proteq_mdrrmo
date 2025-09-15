const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function resetStaffPassword() {
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

        // Hash a new password
        const newPassword = 'staff123';
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        console.log(`New password will be: "${newPassword}"`);
        console.log(`Hashed password: ${hashedPassword}`);

        // Update staff password
        const [result] = await connection.execute(
            'UPDATE staff SET password = ? WHERE email = ?',
            [hashedPassword, '22-33950@g.batstate-u.edu.ph']
        );

        if (result.affectedRows > 0) {
            console.log('✅ Staff password updated successfully');
            console.log(`Use email: 22-33950@g.batstate-u.edu.ph`);
            console.log(`Use password: ${newPassword}`);
        } else {
            console.log('❌ Failed to update staff password');
        }

    } catch (error) {
        console.error('Database error:', error);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

resetStaffPassword();
