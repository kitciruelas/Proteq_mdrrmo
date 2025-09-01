-- Update existing incident reports to have valid reporter IDs
-- This script assigns random users from general_users table to existing incident reports

-- First, let's see what incident reports exist
SELECT incident_id, reported_by FROM incident_reports;

-- Update incident reports to have valid reporter IDs (1-10, corresponding to the sample users)
-- This is a safe update that assigns valid user IDs to existing incident reports

UPDATE incident_reports 
SET reported_by = CASE 
    WHEN incident_id % 10 = 0 THEN 10
    ELSE incident_id % 10
END
WHERE reported_by IS NULL OR reported_by NOT IN (SELECT user_id FROM general_users);

-- Verify the update
SELECT 
    ir.incident_id,
    ir.reported_by,
    CONCAT(gu.first_name, ' ', gu.last_name) as reporter_name,
    gu.email as reporter_email
FROM incident_reports ir
LEFT JOIN general_users gu ON ir.reported_by = gu.user_id
ORDER BY ir.incident_id;
