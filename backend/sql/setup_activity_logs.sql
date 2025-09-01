-- Simple setup script for activity_logs table
-- Run this in your MySQL database to create the new table structure

USE `proteq_mdrrmo`;

-- Drop existing table if it exists (WARNING: This will delete all existing logs!)
DROP TABLE IF EXISTS `activity_logs`;

-- Create new activity_logs table with proper structure
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

  -- Foreign Keys (only add if the referenced tables exist)
  INDEX `idx_activity_logs_admin_id` (`admin_id`),
  INDEX `idx_activity_logs_staff_id` (`staff_id`),
  INDEX `idx_activity_logs_general_user_id` (`general_user_id`),
  INDEX `idx_activity_logs_created_at_desc` (`created_at` DESC),
  INDEX `idx_activity_logs_action` (`action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Add foreign key constraints only if tables exist
-- Uncomment these lines if you want strict foreign key constraints

-- ALTER TABLE `activity_logs` 
-- ADD CONSTRAINT `fk_activity_logs_admin` 
-- FOREIGN KEY (`admin_id`) REFERENCES `admin`(`admin_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- ALTER TABLE `activity_logs` 
-- ADD CONSTRAINT `fk_activity_logs_staff` 
-- FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- ALTER TABLE `activity_logs` 
-- ADD CONSTRAINT `fk_activity_logs_general` 
-- FOREIGN KEY (`general_user_id`) REFERENCES `general_users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Insert a test log to verify the table works
INSERT INTO `activity_logs` (`admin_id`, `action`, `details`, `created_at`) 
VALUES (1, 'table_created', 'Activity logs table created successfully', NOW());

-- Show the table structure
DESCRIBE `activity_logs`;

-- Show the test data
SELECT * FROM `activity_logs`;
