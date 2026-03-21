DO $fix$
BEGIN
  -- Add new behavioral fields to session_settings
  EXECUTE $sql$
    ALTER TABLE session_settings
      ADD COLUMN IF NOT EXISTS pause_notifications boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS auto_save_drafts boolean DEFAULT true
  $sql$;
END;
$fix$;
