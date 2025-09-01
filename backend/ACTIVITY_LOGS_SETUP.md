# 🚀 Activity Logs Setup Guide

## ❌ **Problem: Activity Logging Not Working**

The activity logging is not recording in the database because:
1. Database table structure is outdated
2. Missing IP address fields in INSERT statements
3. Inconsistent error handling

## ✅ **Solution: Complete Fix Process**

### **Step 1: Update Database Structure**

Run this SQL in your MySQL database (phpMyAdmin or command line):

```sql
USE `proteq_mdrrmo`;

-- Drop existing table (WARNING: This deletes all existing logs!)
DROP TABLE IF EXISTS `activity_logs`;

-- Create new table with proper structure
CREATE TABLE `activity_logs` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `admin_id` INT(11) DEFAULT NULL,
  `staff_id` INT(11) DEFAULT NULL,
  `general_user_id` INT(11) DEFAULT NULL,
  `action` VARCHAR(100) NOT NULL,
  `details` TEXT DEFAULT NULL,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `user_agent` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  
  -- Indexes for performance
  INDEX `idx_activity_logs_admin_id` (`admin_id`),
  INDEX `idx_activity_logs_staff_id` (`staff_id`),
  INDEX `idx_activity_logs_general_user_id` (`general_user_id`),
  INDEX `idx_activity_logs_created_at_desc` (`created_at` DESC),
  INDEX `idx_activity_logs_action` (`action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
```

### **Step 2: Run the Fix Script**

```bash
cd backend
node fix-activity-logging.js
```

This script will automatically fix all route files to include:
- IP address capture
- Proper error handling
- Success logging messages

### **Step 3: Test the Setup**

```bash
node test-activity-logs.js
```

This will verify:
- Table structure is correct
- INSERT operations work
- Foreign key relationships are valid

### **Step 4: Restart Your Server**

```bash
# Stop your current server (Ctrl+C)
# Then restart it
npm start
# or
node server.js
```

## 🔍 **What Gets Fixed**

### **Authentication Actions:**
- ✅ User login
- ✅ Admin login  
- ✅ Staff login
- ✅ User registration

### **Management Actions:**
- ✅ Alert resolution/deletion
- ✅ Evacuation center operations
- ✅ Safety protocol operations
- ✅ Team management
- ✅ User management
- ✅ Staff management
- ✅ System settings
- ✅ Reports
- ✅ Evacuation routes

### **IP Address Capture:**
- ✅ Client IP address logging
- ✅ Proxy support (x-forwarded-for)
- ✅ Fallback to connection address

### **Error Handling:**
- ✅ Consistent error logging
- ✅ Success confirmation messages
- ✅ Graceful fallback if logging fails

## 🧪 **Testing the Fix**

1. **Login as any user** - Check console for "✅ Activity logged: user_login"
2. **Perform any admin action** - Check console for success messages
3. **Check database** - Verify records are being inserted

## 📊 **Expected Database Records**

After successful setup, you should see records like:

```sql
SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 5;
```

Example results:
```
| id | admin_id | staff_id | general_user_id | action      | details                    | ip_address    | created_at           |
|----|----------|----------|------------------|-------------|----------------------------|---------------|---------------------|
| 1  | 1        | NULL     | NULL             | admin_login | Admin admin@test.com...   | 192.168.1.100 | 2024-01-15 10:30:00 |
| 2  | NULL     | NULL     | 5                | user_login  | User user@test.com...     | 192.168.1.101 | 2024-01-15 10:25:00 |
```

## 🚨 **Troubleshooting**

### **If still not working:**

1. **Check database connection:**
   ```bash
   node test-activity-logs.js
   ```

2. **Check server logs:**
   - Look for "✅ Activity logged:" messages
   - Look for "❌ Failed to log" errors

3. **Verify table structure:**
   ```sql
   DESCRIBE activity_logs;
   ```

4. **Check foreign key constraints:**
   ```sql
   SHOW CREATE TABLE activity_logs;
   ```

### **Common Issues:**

- **Foreign key errors:** Admin/Staff/User IDs don't exist
- **Permission errors:** Database user lacks INSERT privileges
- **Table not found:** Migration script wasn't run
- **Column mismatch:** Old table structure still in place

## 🎯 **Success Indicators**

- ✅ Console shows "✅ Activity logged: [action]"
- ✅ Database contains new records
- ✅ No error messages in console
- ✅ All user actions are being tracked

## 📞 **Need Help?**

If you're still having issues:
1. Run the test script and share the output
2. Check your database table structure
3. Verify your database connection settings
4. Check server console for error messages
