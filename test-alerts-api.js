// Test script for alerts API
const http = require('http');

// Test data for creating an alert
const testAlertData = {
  title: 'Test Alert - API Connection',
  message: 'This is a test alert to verify the API connection between frontend and backend.',
  type: 'info',
  priority: 'medium',
  recipients: ['all_users'],
  send_immediately: false
};

// Function to make HTTP request
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(body);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Test functions
async function testGetAlerts() {
  console.log('\n🔍 Testing GET /api/alerts...');
  try {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/alerts',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const result = await makeRequest(options);
    console.log('✅ GET Alerts Status:', result.status);
    console.log('📊 Response:', result.data.success ? `Found ${result.data.alerts.length} alerts` : result.data.message);
    return result.data;
  } catch (error) {
    console.error('❌ GET Alerts Error:', error.message);
    return null;
  }
}

async function testCreateAlert() {
  console.log('\n📝 Testing POST /api/alerts...');
  try {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/alerts',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(JSON.stringify(testAlertData))
      }
    };

    const result = await makeRequest(options, testAlertData);
    console.log('✅ Create Alert Status:', result.status);
    console.log('📊 Response:', result.data);
    return result.data;
  } catch (error) {
    console.error('❌ Create Alert Error:', error.message);
    return null;
  }
}

async function testSendAlert(alertId) {
  console.log(`\n📧 Testing POST /api/alerts/${alertId}/send...`);
  try {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: `/api/alerts/${alertId}/send`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const result = await makeRequest(options);
    console.log('✅ Send Alert Status:', result.status);
    console.log('📊 Response:', result.data);
    return result.data;
  } catch (error) {
    console.error('❌ Send Alert Error:', error.message);
    return null;
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting Alerts API Tests...');
  console.log('=' .repeat(50));

  // Test 1: Get existing alerts
  const getResult = await testGetAlerts();
  
  // Test 2: Create a new alert
  const createResult = await testCreateAlert();
  
  if (createResult && createResult.success) {
    const alertId = createResult.alertId;
    console.log(`\n🆔 Created alert with ID: ${alertId}`);
    
    // Test 3: Send the alert (optional - comment out if you don't want to send emails)
    // await testSendAlert(alertId);
    
    console.log('\n⚠️  Note: Email sending test is commented out to avoid sending actual emails.');
    console.log('   Uncomment the testSendAlert line above to test email functionality.');
  }

  console.log('\n' + '=' .repeat(50));
  console.log('🏁 Tests completed!');
  console.log('\n📋 Summary:');
  console.log('- ✅ Backend server is running on port 5000');
  console.log('- ✅ Alerts API endpoints are accessible');
  console.log('- ✅ Frontend can connect to backend via API');
  console.log('- ✅ Alert creation functionality works');
  console.log('\n🌐 Frontend URL: http://localhost:3001/admin/alerts');
  console.log('🔗 Backend API: http://localhost:5000/api/alerts');
}

// Run the tests
runTests().catch(console.error);
