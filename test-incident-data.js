// Test script to check incident data and barangay extraction
const mysql = require('mysql2/promise');

async function testIncidentData() {
    const pool = mysql.createPool({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'proteq_mdrrmo',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    try {
        console.log('Testing incident data...\n');

        // Check if there are any incidents
        const [incidents] = await pool.execute(`
            SELECT incident_id, incident_type, description, latitude, longitude
            FROM incident_reports
            WHERE description IS NOT NULL AND description != ''
            ORDER BY date_reported DESC
            LIMIT 10
        `);

        console.log(`Found ${incidents.length} incidents with descriptions:\n`);

        if (incidents.length === 0) {
            console.log('❌ No incidents found with descriptions!');
            console.log('💡 Suggestion: Add some sample incidents with barangay names in descriptions');
            return;
        }

        // Test barangay extraction
        incidents.forEach((incident, index) => {
            console.log(`${index + 1}. Incident ID: ${incident.incident_id}`);
            console.log(`   Type: ${incident.incident_type}`);
            console.log(`   Description: "${incident.description}"`);
            console.log(`   Coordinates: ${incident.latitude}, ${incident.longitude}`);

            // Test barangay extraction
            const barangay = extractBarangay(incident.description);
            console.log(`   Extracted Barangay: ${barangay || 'None found'}`);
            console.log('');
        });

        // Test the full endpoint logic
        console.log('Testing full barangay grouping logic...\n');

        const barangayMap = new Map();

        incidents.forEach(incident => {
            let barangayName = null;

            // Extract barangay from description
            if (incident.description) {
                barangayName = extractBarangay(incident.description);
            }

            // Fallback to coordinate-based grouping
            if (!barangayName) {
                if (incident.latitude >= 14.5 && incident.longitude >= 121.0) {
                    barangayName = 'North Area';
                } else if (incident.latitude >= 14.4 && incident.longitude >= 121.0) {
                    barangayName = 'Central Area';
                } else if (incident.latitude >= 14.3 && incident.longitude >= 121.0) {
                    barangayName = 'South Area';
                } else {
                    barangayName = 'Other Areas';
                }
            }

            const incidentType = incident.incident_type;

            if (!barangayMap.has(barangayName)) {
                barangayMap.set(barangayName, { name: barangayName });
            }

            if (!barangayMap.get(barangayName)[incidentType]) {
                barangayMap.get(barangayName)[incidentType] = 0;
            }
            barangayMap.get(barangayName)[incidentType]++;
        });

        const stackedData = Array.from(barangayMap.values());

        console.log('Final grouped data for chart:');
        stackedData.forEach(item => {
            console.log(`📊 ${item.name}:`, item);
        });

        console.log(`\n✅ Test completed! Found ${stackedData.length} barangay areas.`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

function extractBarangay(description) {
    if (!description) return null;

    const desc = description.toLowerCase();

    // Common barangay patterns in descriptions
    const barangayPatterns = [
        /barangay\s+([a-zA-Z\s\d]+)(?:,|\.|$)/i,
        /brgy\.?\s+([a-zA-Z\s\d]+)(?:,|\.|$)/i,
        /bgy\.?\s+([a-zA-Z\s\d]+)(?:,|\.|$)/i,
        /in\s+([a-zA-Z\s\d]+)\s+barangay/i,
        /at\s+([a-zA-Z\s\d]+)\s+barangay/i,
        /([a-zA-Z\s\d]+)\s+barangay/i
    ];

    for (const pattern of barangayPatterns) {
        const match = desc.match(pattern);
        if (match && match[1]) {
            // Clean up the barangay name
            let barangayName = match[1].trim();
            // Remove common suffixes and clean up
            barangayName = barangayName.replace(/\s+(proper|district|area|poblacion)$/i, '');
            barangayName = barangayName.replace(/^the\s+/i, '');
            return barangayName.charAt(0).toUpperCase() + barangayName.slice(1).toLowerCase();
        }
    }

    return null;
}

// Run the test
testIncidentData();
