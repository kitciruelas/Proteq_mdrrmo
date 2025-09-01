-- Add assignment columns to incident_reports table
ALTER TABLE `incident_reports` 
ADD COLUMN `assigned_team_id` int(11) DEFAULT NULL AFTER `assigned_to`,
ADD COLUMN `assigned_staff_id` int(11) DEFAULT NULL AFTER `assigned_team_id`;

-- Add foreign key constraints
ALTER TABLE `incident_reports` 
ADD CONSTRAINT `fk_incident_team` FOREIGN KEY (`assigned_team_id`) REFERENCES `teams`(`id`) ON DELETE SET NULL,
ADD CONSTRAINT `fk_incident_staff` FOREIGN KEY (`assigned_staff_id`) REFERENCES `staff`(`id`) ON DELETE SET NULL;
