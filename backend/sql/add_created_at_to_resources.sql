-- Add created_at column to evacuation_resources table if it doesn't exist
ALTER TABLE `evacuation_resources` 
ADD COLUMN IF NOT EXISTS `created_at` timestamp NOT NULL DEFAULT current_timestamp() AFTER `picture`;

