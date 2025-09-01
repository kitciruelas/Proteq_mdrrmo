-- Simple script to update incident reports to use existing user John Doe (ID: 1)
-- This will fix the "Reported by: 1" issue to show "Reported by: John Doe"

-- First, check current incident reports
SELECT incident_id, reported_by FROM incident_reports;

-- Update all incident reports to use user ID 1 (John Doe)
UPDATE incident_reports 
SET reported_by = 1 
WHERE reported_by IS NULL OR reported_by NOT IN (SELECT user_id FROM general_users);

-- Verify the update - this should now show the reporter name
SELECT 
    ir.incident_id,
    ir.reported_by,
    CONCAT(gu.first_name, ' ', gu.last_name) as reporter_name,
    gu.email as reporter_email
FROM incident_reports ir
LEFT JOIN general_users gu ON ir.reported_by = gu.user_id
ORDER BY ir.incident_id;
