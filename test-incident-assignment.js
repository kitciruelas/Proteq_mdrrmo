const fetch = require('node-fetch');

const API_BASE_URL = 'http://localhost:5000/api';

async function testIncidentAssignment() {
  console.log('🧪 Testing Incident Assignment Routes...\n');

  try {
    // Test 1: Get all incidents
    console.log('1. Testing GET /incidents');
    const incidentsResponse = await fetch(`${API_BASE_URL}/incidents`);
    const incidentsData = await incidentsResponse.json();
    
    if (incidentsData.success) {
      console.log('✅ GET /incidents successful');
      console.log(`   Found ${incidentsData.incidents.length} incidents`);
      
      if (incidentsData.incidents.length > 0) {
        const firstIncident = incidentsData.incidents[0];
        console.log(`   First incident ID: ${firstIncident.incident_id}`);
        console.log(`   First incident type: ${firstIncident.incident_type}`);
        
        // Test 2: Assign team to incident
        console.log('\n2. Testing PUT /incidents/:id/assign-team');
        const assignTeamResponse = await fetch(`${API_BASE_URL}/incidents/${firstIncident.incident_id}/assign-team`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ teamId: 1 }) // Assuming team ID 1 exists
        });
        
        const assignTeamData = await assignTeamResponse.json();
        
        if (assignTeamData.success) {
          console.log('✅ Team assignment successful');
          console.log(`   Email sent: ${assignTeamData.emailSent}`);
          if (assignTeamData.emailDetails) {
            console.log(`   Email details:`, assignTeamData.emailDetails);
          }
        } else {
          console.log('❌ Team assignment failed:', assignTeamData.message);
        }
        
        // Test 3: Assign staff to incident
        console.log('\n3. Testing PUT /incidents/:id/assign-staff');
        const assignStaffResponse = await fetch(`${API_BASE_URL}/incidents/${firstIncident.incident_id}/assign-staff`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ staffId: 1 }) // Assuming staff ID 1 exists
        });
        
        const assignStaffData = await assignStaffResponse.json();
        
        if (assignStaffData.success) {
          console.log('✅ Staff assignment successful');
          console.log(`   Email sent: ${assignStaffData.emailSent}`);
          if (assignStaffData.emailDetails) {
            console.log(`   Email details:`, assignStaffData.emailDetails);
          }
        } else {
          console.log('❌ Staff assignment failed:', assignStaffData.message);
        }
        
        // Test 4: Clear assignments
        console.log('\n4. Testing clearing assignments');
        const clearTeamResponse = await fetch(`${API_BASE_URL}/incidents/${firstIncident.incident_id}/assign-team`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ teamId: null })
        });
        
        const clearTeamData = await clearTeamResponse.json();
        console.log('✅ Clear team assignment:', clearTeamData.success);
        
        const clearStaffResponse = await fetch(`${API_BASE_URL}/incidents/${firstIncident.incident_id}/assign-staff`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ staffId: null })
        });
        
        const clearStaffData = await clearStaffResponse.json();
        console.log('✅ Clear staff assignment:', clearStaffData.success);
        
      } else {
        console.log('⚠️ No incidents found to test with');
      }
    } else {
      console.log('❌ GET /incidents failed:', incidentsData.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
  
  console.log('\n🏁 Testing completed!');
}

// Run the test
testIncidentAssignment();

