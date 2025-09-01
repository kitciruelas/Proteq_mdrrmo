// Test script to verify login functionality
const fetch = require('node-fetch');

async function testLogin() {
    const baseUrl = 'http://localhost:5000/api/auth';
    
    console.log('Testing login endpoints...\n');
    
    // Test 1: User login with plain text password
    console.log('1. Testing user login (plain text password):');
    try {
        const userResponse = await fetch(`${baseUrl}/login/user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: 'ciruelaskeithandrei@gmail.com',
                password: 'KIT1234'
            })
        });
        
        const userData = await userResponse.json();
        console.log('Status:', userResponse.status);
        console.log('Response:', userData);
    } catch (error) {
        console.log('Error:', error.message);
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Test 2: Admin login with hashed password (we need to know the original password)
    console.log('2. Testing admin login (hashed password):');
    try {
        const adminResponse = await fetch(`${baseUrl}/login/admin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: 'admin1@gmail.com',
                password: 'admin123' // Common password - we'll try this
            })
        });
        
        const adminData = await adminResponse.json();
        console.log('Status:', adminResponse.status);
        console.log('Response:', adminData);
    } catch (error) {
        console.log('Error:', error.message);
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Test 3: Staff login with hashed password
    console.log('3. Testing staff login (hashed password):');
    try {
        const staffResponse = await fetch(`${baseUrl}/login/staff`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: 'kit@gmail.com',
                password: 'kit123' // Common password - we'll try this
            })
        });
        
        const staffData = await staffResponse.json();
        console.log('Status:', staffResponse.status);
        console.log('Response:', staffData);
    } catch (error) {
        console.log('Error:', error.message);
    }
}

testLogin();
