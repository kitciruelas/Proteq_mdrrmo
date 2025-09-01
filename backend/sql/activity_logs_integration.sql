-- Activity Logs Integration for proteq_mdrrmo database
-- This file adds the activity_logs table with proper foreign key constraints

USE `proteq_mdrrmo`;

-- Create activity_logs table with new structure
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

-- Create indexes for better performance
CREATE INDEX `idx_activity_logs_admin_id` ON `activity_logs` (`admin_id`);
CREATE INDEX `idx_activity_logs_staff_id` ON `activity_logs` (`staff_id`);
CREATE INDEX `idx_activity_logs_general_user_id` ON `activity_logs` (`general_user_id`);
CREATE INDEX `idx_activity_logs_created_at_desc` ON `activity_logs` (`created_at` DESC);
CREATE INDEX `idx_activity_logs_action` ON `activity_logs` (`action`);

-- Insert sample activity logs for testing (only if users exist)
-- Make sure you have at least one record in each table before running these inserts

-- Sample admin activity (requires admin with admin_id = 1)
-- INSERT INTO `activity_logs` (`admin_id`, `action`, `details`, `ip_address`, `created_at`) VALUES
-- (1, 'login', 'Admin user logged in successfully', '192.168.1.100', NOW());

-- Sample staff activity (requires staff with id = 1)  
-- INSERT INTO `activity_logs` (`staff_id`, `action`, `details`, `ip_address`, `created_at`) VALUES
-- (1, 'incident_update', 'Updated incident #123 status to resolved', '192.168.1.101', NOW());

-- Sample user activity (requires general_user with user_id = 1)
-- INSERT INTO `activity_logs` (`general_user_id`, `action`, `details`, `ip_address`, `created_at`) VALUES
-- (1, 'incident_report', 'Reported new incident: Fire in Barangay 1', '192.168.1.200', NOW());
