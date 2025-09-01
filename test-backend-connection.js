const fetch = require('node-fetch');

async function testBackendConnection() {
  console.log('🔍 Testing backend connection...\n');
  
  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await fetch('http://localhost:5000/api/health');
    console.log(`   Status: ${healthResponse.status} ${healthResponse.statusText}`);
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('   Response:', healthData);
      console.log('   ✅ Health check passed\n');
    } else {
      console.log('   ❌ Health check failed\n');
      return;
    }
    
    // Test incidents endpoint structure
    console.log('2. Testing incidents endpoint structure...');
    const incidentsResponse = await fetch('http://localhost:5000/api/incidents/user/1');
    console.log(`   Status: ${incidentsResponse.status} ${incidentsResponse.statusText}`);
    
    if (incidentsResponse.ok) {
      const incidentsData = await incidentsResponse.json();
      console.log('   Response structure:', Object.keys(incidentsData));
      console.log('   ✅ Incidents endpoint accessible\n');
    } else {
      const errorText = await incidentsResponse.text();
      console.log('   Response body:', errorText.substring(0, 200) + '...');
      console.log('   ⚠️ Incidents endpoint returned error (this might be expected for invalid user ID)\n');
    }
    
    // Test root endpoint
    console.log('3. Testing root endpoint...');
    const rootResponse = await fetch('http://localhost:5000/');
    console.log(`   Status: ${rootResponse.status} ${rootResponse.statusText}`);
    
    if (rootResponse.ok) {
      const rootData = await rootResponse.json();
      console.log('   Response:', rootData);
      console.log('   ✅ Root endpoint accessible\n');
    } else {
      console.log('   ❌ Root endpoint failed\n');
    }
    
    console.log('🎯 Backend connection test completed!');
    
  } catch (error) {
    console.error('❌ Error testing backend connection:', error.message);
    console.log('\n💡 Make sure:');
    console.log('   • Backend server is running on port 5000');
    console.log('   • Database connection is working');
    console.log('   • No firewall blocking the connection');
  }
}

// Run the test
testBackendConnection();
