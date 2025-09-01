const API_BASE_URL = 'http://localhost:5000/api';

async function testStaffIncidentsEndpoint() {
  console.log('🧪 Testing Staff Incidents Endpoint');
  console.log('=====================================');

  try {
    // Test 1: Get all incidents first to see what's available
    console.log('\n📋 Test 1: Getting all incidents...');
    const allIncidentsResponse = await fetch(`${API_BASE_URL}/incidents`);
    const allIncidentsData = await allIncidentsResponse.json();
    
    if (allIncidentsData.success && allIncidentsData.incidents.length > 0) {
      console.log('✅ Found incidents:', allIncidentsData.incidents.length);
      
      // Find incidents with staff or team assignments
      const assignedIncidents = allIncidentsData.incidents.filter(incident => 
        incident.assigned_staff_id || incident.assigned_team_id
      );
      
      console.log('📊 Assigned incidents:', assignedIncidents.length);
      
      if (assignedIncidents.length > 0) {
        // Test with the first staff ID we find
        const testStaffId = assignedIncidents[0].assigned_staff_id || 
                           (assignedIncidents.find(i => i.assigned_staff_id)?.assigned_staff_id);
        
        if (testStaffId) {
          console.log(`\n👤 Test 2: Testing staff incidents endpoint for staff ID: ${testStaffId}`);
          
          const staffIncidentsResponse = await fetch(`${API_BASE_URL}/incidents/staff/${testStaffId}`);
          const staffIncidentsData = await staffIncidentsResponse.json();
          
          if (staffIncidentsData.success) {
            console.log('✅ Staff incidents endpoint working!');
            console.log('📋 Staff info:', staffIncidentsData.staffInfo);
            console.log('📊 Assignment stats:', staffIncidentsData.assignmentStats);
            console.log('🔍 Incidents found:', staffIncidentsData.incidents.length);
            
            // Show sample incidents
            staffIncidentsData.incidents.slice(0, 3).forEach((incident, index) => {
              console.log(`\n📝 Incident ${index + 1}:`);
              console.log(`   ID: ${incident.incident_id}`);
              console.log(`   Type: ${incident.incident_type}`);
              console.log(`   Assignment Type: ${incident.assignment_type}`);
              console.log(`   Status: ${incident.status}`);
              console.log(`   Priority: ${incident.priority_level}`);
            });
            
          } else {
            console.log('❌ Staff incidents endpoint failed:', staffIncidentsData.message);
          }
        } else {
          console.log('⚠️ No staff-assigned incidents found to test with');
        }
      } else {
        console.log('⚠️ No assigned incidents found');
      }
    } else {
      console.log('❌ No incidents found in the system');
    }

  } catch (error) {
    console.error('❌ Error testing staff incidents endpoint:', error);
  }
}

// Run the test
testStaffIncidentsEndpoint();

