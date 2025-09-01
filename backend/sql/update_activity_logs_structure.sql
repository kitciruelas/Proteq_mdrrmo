-- Migration script to update activity_logs table structure
-- This script converts from the old structure (user_type, user_id) to the new structure (admin_id, staff_id, general_user_id)

-- Step 1: Create new table with the updated structure
CREATE TABLE IF NOT EXISTS `activity_logs_new` (
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

-- Step 2: Migrate existing data
-- Convert old user_type and user_id to new foreign key columns
INSERT INTO `activity_logs_new` (
  `action`, `details`, `ip_address`, `user_agent`, `created_at`,
  `admin_id`, `staff_id`, `general_user_id`
)
SELECT 
  `action`, `details`, `ip_address`, `user_agent`, `created_at`,
  CASE WHEN `user_type` = 'admin' THEN `user_id` ELSE NULL END as `admin_id`,
  CASE WHEN `user_type` = 'staff' THEN `user_id` ELSE NULL END as `staff_id`,
  CASE WHEN `user_type` = 'user' THEN `user_id` ELSE NULL END as `general_user_id`
FROM `activity_logs`;

-- Step 3: Drop old table and rename new table
DROP TABLE IF EXISTS `activity_logs`;
ALTER TABLE `activity_logs_new` RENAME TO `activity_logs`;

-- Step 4: Create indexes for better performance
CREATE INDEX `idx_activity_logs_admin_id` ON `activity_logs` (`admin_id`);
CREATE INDEX `idx_activity_logs_staff_id` ON `activity_logs` (`staff_id`);
CREATE INDEX `idx_activity_logs_general_user_id` ON `activity_logs` (`general_user_id`);
CREATE INDEX `idx_activity_logs_created_at_desc` ON `activity_logs` (`created_at` DESC);
CREATE INDEX `idx_activity_logs_action` ON `activity_logs` (`action`);

-- Step 5: Verify migration
SELECT 
  'Migration completed successfully' as status,
  COUNT(*) as total_logs,
  SUM(CASE WHEN admin_id IS NOT NULL THEN 1 ELSE 0 END) as admin_logs,
  SUM(CASE WHEN staff_id IS NOT NULL THEN 1 ELSE 0 END) as staff_logs,
  SUM(CASE WHEN general_user_id IS NOT NULL THEN 1 ELSE 0 END) as user_logs
FROM `activity_logs`;

