// Test script to verify registration functionality
async function testRegistration() {
    const baseUrl = 'http://localhost:5000/api/auth';
    
    console.log('Testing user registration endpoint...\n');
    
    // Test registration with valid data
    const testUser = {
        firstName: 'John',
        lastName: 'Doe',
        email: `test${Date.now()}@example.com`, // Unique email
        password: 'TestPassword123',
        userType: 'STUDENT',
        department: 'Computer Science',
        college: 'College of Engineering'
    };
    
    try {
        console.log('Registering user:', testUser.email);
        
        const response = await fetch(`${baseUrl}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testUser)
        });
        
        const data = await response.json();
        
        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(data, null, 2));
        
        if (response.ok && data.success) {
            console.log('\n✅ Registration successful!');
            
            // Test login with the newly created user
            console.log('\nTesting login with new user...');
            
            const loginResponse = await fetch(`${baseUrl}/login/user`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: testUser.email,
                    password: testUser.password
                })
            });
            
            const loginData = await loginResponse.json();
            console.log('Login Status:', loginResponse.status);
            console.log('Login Response:', JSON.stringify(loginData, null, 2));
            
            if (loginResponse.ok && loginData.success) {
                console.log('\n✅ Login with new user successful!');
            } else {
                console.log('\n❌ Login with new user failed');
            }
            
        } else {
            console.log('\n❌ Registration failed');
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Test duplicate email registration
async function testDuplicateEmail() {
    const baseUrl = 'http://localhost:5000/api/auth';
    
    console.log('\n' + '='.repeat(50));
    console.log('Testing duplicate email registration...\n');
    
    const duplicateUser = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'ciruelaskeithandrei@gmail.com', // Existing email
        password: 'TestPassword123',
        userType: 'FACULTY',
        department: 'Mathematics',
        college: 'College of Arts and Sciences'
    };
    
    try {
        const response = await fetch(`${baseUrl}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(duplicateUser)
        });
        
        const data = await response.json();
        
        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(data, null, 2));
        
        if (response.status === 409) {
            console.log('\n✅ Duplicate email properly rejected!');
        } else {
            console.log('\n❌ Duplicate email handling failed');
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Run tests
async function runTests() {
    await testRegistration();
    await testDuplicateEmail();
}

runTests();
