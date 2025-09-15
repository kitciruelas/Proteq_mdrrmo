// Test script for guest incident reporting
const testGuestIncidentReport = async () => {
  const guestPayload = {
    incidentType: 'fire',
    description: 'Test fire incident reported by guest user. This is a detailed description of the incident that occurred.',
    location: 'Barangay Alupay, Rosario, Batangas',
    latitude: 13.8404,
    longitude: 121.2922,
    priorityLevel: 'high',
    safetyStatus: 'safe',
    guestName: 'John Doe',
    guestContact: '+639123456789'
  };

  try {
    console.log('🧪 Testing guest incident report submission...');
    console.log('Payload:', JSON.stringify(guestPayload, null, 2));

    const response = await fetch('http://localhost:5000/api/incidents/report-guest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(guestPayload)
    });

    console.log('Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Guest incident report submitted successfully!');
      console.log('Response:', JSON.stringify(data, null, 2));
    } else {
      const error = await response.json();
      console.log('❌ Guest incident report failed');
      console.log('Error:', JSON.stringify(error, null, 2));
    }
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
};

// Test script for authenticated incident report
const testAuthenticatedIncidentReport = async () => {
  // This would require a valid JWT token from a logged-in user
  const authPayload = {
    incidentType: 'medical',
    description: 'Test medical emergency reported by authenticated user. This is a detailed description of the incident.',
    location: 'Barangay Antipolo, Rosario, Batangas',
    latitude: 13.7080,
    longitude: 121.3096,
    priorityLevel: 'critical',
    safetyStatus: 'injured'
  };

  try {
    console.log('🧪 Testing authenticated incident report submission...');
    console.log('Payload:', JSON.stringify(authPayload, null, 2));

    // Note: This would need a valid JWT token
    const response = await fetch('http://localhost:5000/api/incidents/report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_JWT_TOKEN_HERE'
      },
      body: JSON.stringify(authPayload)
    });

    console.log('Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Authenticated incident report submitted successfully!');
      console.log('Response:', JSON.stringify(data, null, 2));
    } else {
      const error = await response.json();
      console.log('❌ Authenticated incident report failed');
      console.log('Error:', JSON.stringify(error, null, 2));
    }
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
};

// Run the tests
console.log('🚀 Starting incident reporting tests...\n');

// Test guest reporting
testGuestIncidentReport().then(() => {
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test authenticated reporting (commented out as it requires valid token)
  console.log('ℹ️  Authenticated incident report test requires a valid JWT token');
  console.log('ℹ️  To test authenticated reporting, login first and use the token');
  
  console.log('\n✅ Tests completed!');
});
