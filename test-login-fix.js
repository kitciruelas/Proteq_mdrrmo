const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

async function testUserLogin() {
  try {
    console.log('Testing user login...');
    
    // Test with a sample user (you may need to adjust these credentials)
    const response = await axios.post(`${API_BASE}/auth/login/user`, {
      email: 'test.user@example.com',
      password: 'password123'
    });
    
    console.log('Login response:', response.data);
    
    if (response.data.success && response.data.token) {
      console.log('✅ Login successful! Token received:', response.data.token.substring(0, 50) + '...');
      
      // Test profile access with the token
      const profileResponse = await axios.get(`${API_BASE}/profile/me`, {
        headers: {
          'Authorization': `Bearer ${response.data.token}`
        }
      });
      
      console.log('✅ Profile access successful:', profileResponse.data);
    } else {
      console.log('❌ Login failed:', response.data.message);
    }
  } catch (error) {
    console.log('❌ Error:', error.response?.data || error.message);
  }
}

// Run the test
testUserLogin();
