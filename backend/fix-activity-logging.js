const fs = require('fs');
const path = require('path');

// Helper function to get client IP address
const getClientIPCode = `
  const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip || 'unknown';
`;

// Function to fix activity logging in a file
function fixActivityLogging(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    console.log(`🔧 Fixing: ${path.basename(filePath)}`);
    
    // Fix INSERT statements without ip_address
    const insertPattern = /INSERT INTO activity_logs \(([^)]+)\) VALUES \(([^)]+)\)/g;
    let match;
    
    while ((match = insertPattern.exec(content)) !== null) {
      const columns = match[1];
      const values = match[2];
      
      // Check if ip_address is missing
      if (!columns.includes('ip_address')) {
        console.log(`  📝 Found INSERT without ip_address: ${match[0].substring(0, 100)}...`);
        
        // Add ip_address to columns
        const newColumns = columns.replace(/created_at$/, 'ip_address, created_at');
        
        // Add clientIP variable and ip_address to values
        const newValues = values.replace(/NOW\(\)\)$/, 'clientIP, NOW())');
        
        // Create the replacement
        const replacement = `INSERT INTO activity_logs (${newColumns}) VALUES (${newValues}`;
        
        // Add clientIP variable before the INSERT
        const beforeInsert = content.substring(0, content.indexOf(match[0]));
        const afterInsert = content.substring(content.indexOf(match[0]) + match[0].length);
        
        content = beforeInsert + getClientIPCode + '\n      ' + replacement + afterInsert;
        modified = true;
        
        console.log(`  ✅ Fixed INSERT statement`);
      }
    }
    
    // Fix console.warn to console.error for consistency
    content = content.replace(/console\.warn\(/g, 'console.error(');
    
    // Add success logging messages
    content = content.replace(
      /Failed to log ([^:]+) activity:/g,
      '✅ Activity logged: $1\n    } catch (logError) {\n      console.error(\'❌ Failed to log $1 activity:\''
    );
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`  ✅ File updated successfully`);
    } else {
      console.log(`  ℹ️  No changes needed`);
    }
    
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
  }
}

// List of route files to fix
const routeFiles = [
  'routes/evacuationCentersRoutes.js',
  'routes/safetyProtocolsRoutes.js',
  'routes/teamsRoutes.js',
  'routes/adminAuthRoutes.js',
  'routes/userManagementRoutes.js',
  'routes/staffManagementRoutes.js',
  'routes/systemSettingsRoutes.js',
  'routes/reportsRoutes.js',
  'routes/evacuationRoutesRoutes.js'
];

console.log('🚀 Starting Activity Logging Fix Process...\n');

// Fix each route file
routeFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    fixActivityLogging(filePath);
    console.log('');
  } else {
    console.log(`⚠️  File not found: ${file}`);
  }
});

console.log('🎉 Activity Logging Fix Process Completed!');
console.log('\n📋 Next Steps:');
console.log('1. Run the database setup script: backend/sql/setup_activity_logs.sql');
console.log('2. Test the functionality: node test-activity-logs.js');
console.log('3. Restart your server to apply changes');
