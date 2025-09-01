const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'proteq_mdrrmo',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    debug: true,
    trace: true
});

// Add connection error handling
pool.on('error', (err) => {
    console.error('MySQL Pool Error:', err);
});

module.exports = pool;