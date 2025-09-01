-- Add team leaders to staff_teams table
-- This script assigns team leaders based on position and seniority

-- Clear existing staff_teams entries (if any)
DELETE FROM staff_teams;

-- Add team leaders and members to staff_teams table
-- Team 1: Alpha Response Team - John Smith as leader
INSERT INTO staff_teams (staff_id, team_id, role) VALUES
(1, 1, 'leader'),  -- John Smith - Emergency Response Coordinator
(2, 1, 'member'),  -- Maria Santos
(6, 1, 'member');  -- Luzviminda Torres

-- Team 2: Medical Emergency Team - Dr. Carlos Reyes as leader
INSERT INTO staff_teams (staff_id, team_id, role) VALUES
(3, 2, 'leader'),  -- Dr. Carlos Reyes - Medical Team Lead
(8, 2, 'member');  -- Carmen Mendoza

-- Team 3: Search and Rescue Team - Fernando Lopez as leader
INSERT INTO staff_teams (staff_id, team_id, role) VALUES
(7, 3, 'leader');  -- Fernando Lopez - Safety Protocol Manager

-- Team 4: Communications Team - Ana Cruz as leader
INSERT INTO staff_teams (staff_id, team_id, role) VALUES
(4, 4, 'leader');  -- Ana Cruz - Communications Officer

-- Team 5: Logistics Support Team - Roberto Garcia as leader
INSERT INTO staff_teams (staff_id, team_id, role) VALUES
(5, 5, 'leader');  -- Roberto Garcia - Logistics Coordinator

-- Update member_count in teams table
UPDATE teams t SET member_count = (
  SELECT COUNT(*) FROM staff_teams st WHERE st.team_id = t.id
);

