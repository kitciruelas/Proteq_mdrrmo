-- Complete Activity Logs SQL for proteq_mdrrmo database
-- Run this SQL to add activity logging functionality to your existing database

USE `proteq_mdrrmo`;

-- =====================================================
-- CREATE ACTIVITY LOGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS `activity_logs` (
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

  -- Foreign Keys
  CONSTRAINT `fk_activity_logs_admin` FOREIGN KEY (`admin_id`) REFERENCES `admin`(`admin_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_activity_logs_staff` FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_activity_logs_general` FOREIGN KEY (`general_user_id`) REFERENCES `general_users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =====================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX `idx_activity_logs_admin_id` ON `activity_logs` (`admin_id`);
CREATE INDEX `idx_activity_logs_staff_id` ON `activity_logs` (`staff_id`);
CREATE INDEX `idx_activity_logs_general_user_id` ON `activity_logs` (`general_user_id`);
CREATE INDEX `idx_activity_logs_created_at_desc` ON `activity_logs` (`created_at` DESC);
CREATE INDEX `idx_activity_logs_action` ON `activity_logs` (`action`);

-- =====================================================
-- INSERT SAMPLE DATA (UNCOMMENT IF YOU HAVE USERS)
-- =====================================================

-- Sample admin activity (requires admin with admin_id = 1)
-- INSERT INTO `activity_logs` (`admin_id`, `action`, `details`, `ip_address`, `created_at`) VALUES
-- (1, 'login', 'Admin user logged in successfully', '192.168.1.100', NOW()),
-- (1, 'user_management', 'Created new staff member: John Doe', '192.168.1.100', NOW()),
-- (1, 'system_settings', 'Updated system configuration', '192.168.1.100', NOW());

-- Sample staff activity (requires staff with id = 1)
-- INSERT INTO `activity_logs` (`staff_id`, `action`, `details`, `ip_address`, `created_at`) VALUES
-- (1, 'login', 'Staff member logged in', '192.168.1.101', NOW()),
-- (1, 'incident_update', 'Updated incident #123 status to resolved', '192.168.1.101', NOW()),
-- (1, 'incident_create', 'Created new incident report', '192.168.1.101', NOW());

-- Sample user activity (requires general_user with user_id = 1)
-- INSERT INTO `activity_logs` (`general_user_id`, `action`, `details`, `ip_address`, `created_at`) VALUES
-- (1, 'login', 'Citizen user logged in', '192.168.1.200', NOW()),
-- (1, 'incident_report', 'Reported new incident: Fire in Barangay 1', '192.168.1.200', NOW()),
-- (1, 'profile_update', 'Updated personal information', '192.168.1.200', NOW());

-- =====================================================
-- USEFUL QUERIES FOR ACTIVITY LOGS
-- =====================================================

-- Get all activity logs with user details
-- SELECT 
--   al.*,
--   CASE 
--     WHEN al.admin_id IS NOT NULL THEN a.name
--     WHEN al.staff_id IS NOT NULL THEN s.name
--     WHEN al.general_user_id IS NOT NULL THEN CONCAT(u.first_name, ' ', u.last_name)
--     ELSE 'Unknown User'
--   END as user_name,
--   CASE 
--     WHEN al.admin_id IS NOT NULL THEN a.email
--     WHEN al.staff_id IS NOT NULL THEN s.email
--     WHEN al.general_user_id IS NOT NULL THEN u.email
--     ELSE NULL
--   END as user_email,
--   CASE 
--     WHEN al.admin_id IS NOT NULL THEN 'admin'
--     WHEN al.staff_id IS NOT NULL THEN 'staff'
--     WHEN al.general_user_id IS NOT NULL THEN 'user'
--     ELSE 'unknown'
--   END as user_type
-- FROM activity_logs al
-- LEFT JOIN admin a ON al.admin_id = a.admin_id
-- LEFT JOIN staff s ON al.staff_id = s.id
-- LEFT JOIN general_users u ON al.general_user_id = u.user_id
-- ORDER BY al.created_at DESC;

-- Get activity logs by user type
-- SELECT * FROM activity_logs WHERE admin_id IS NOT NULL ORDER BY created_at DESC;
-- SELECT * FROM activity_logs WHERE staff_id IS NOT NULL ORDER BY created_at DESC;
-- SELECT * FROM activity_logs WHERE general_user_id IS NOT NULL ORDER BY created_at DESC;

-- Get recent activities (last 24 hours)
-- SELECT * FROM activity_logs 
-- WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) 
-- ORDER BY created_at DESC;

-- Get activity count by user type
-- SELECT 
--   CASE 
--     WHEN admin_id IS NOT NULL THEN 'admin'
--     WHEN staff_id IS NOT NULL THEN 'staff'
--     WHEN general_user_id IS NOT NULL THEN 'user'
--     ELSE 'unknown'
--   END as user_type,
--   COUNT(*) as activity_count 
-- FROM activity_logs 
-- GROUP BY 
--   CASE 
--     WHEN admin_id IS NOT NULL THEN 'admin'
--     WHEN staff_id IS NOT NULL THEN 'staff'
--     WHEN general_user_id IS NOT NULL THEN 'user'
--     ELSE 'unknown'
--   END
-- ORDER BY activity_count DESC;

-- Get most common actions
-- SELECT action, COUNT(*) as action_count 
-- FROM activity_logs 
-- GROUP BY action 
-- ORDER BY action_count DESC 
-- LIMIT 10;

-- =====================================================
-- CLEANUP QUERIES (OPTIONAL)
-- =====================================================

-- Delete logs older than 90 days
-- DELETE FROM activity_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);

-- Delete logs for specific admin
-- DELETE FROM activity_logs WHERE admin_id = 1;

-- Delete logs for specific staff
-- DELETE FROM activity_logs WHERE staff_id = 1;

-- Delete logs for specific user
-- DELETE FROM activity_logs WHERE general_user_id = 1;

-- =====================================================
-- FOREIGN KEY RELATIONSHIPS
-- =====================================================
-- The table now has proper foreign key constraints:
--
-- admin_id -> references admin.admin_id
-- staff_id -> references staff.id  
-- general_user_id -> references general_users.user_id
--
-- These foreign keys ensure referential integrity and
-- automatically handle cascading deletes when users are removed.
