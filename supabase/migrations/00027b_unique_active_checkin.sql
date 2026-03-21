-- Prevent duplicate active check-in sessions per couple
-- Only one in-progress check-in allowed at a time per couple
CREATE UNIQUE INDEX idx_check_ins_active_couple
ON check_ins (couple_id)
WHERE status = 'in-progress';
