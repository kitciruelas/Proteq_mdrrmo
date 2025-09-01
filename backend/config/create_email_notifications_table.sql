-- Create email_notifications table for logging email sending attempts
CREATE TABLE IF NOT EXISTS `email_notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `incident_id` int(11) NOT NULL,
  `team_id` int(11) DEFAULT NULL,
  `staff_id` int(11) DEFAULT NULL,
  `total_recipients` int(11) NOT NULL DEFAULT 0,
  `emails_sent` int(11) NOT NULL DEFAULT 0,
  `emails_failed` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_email_incident` (`incident_id`),
  KEY `fk_email_team` (`team_id`),
  KEY `fk_email_staff` (`staff_id`),
  CONSTRAINT `fk_email_incident` FOREIGN KEY (`incident_id`) REFERENCES `incident_reports`(`incident_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_email_team` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_email_staff` FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
