// Database row types matching Supabase schema exactly
// Every field matches the SQL column type from migrations

export interface DbProfile {
  id: string
  email: string
  display_name: string | null
  avatar_url: string | null
  plan: string
  couple_id: string | null
  created_at: string
  updated_at: string
  email_bounced_at: string | null
  email_complained_at: string | null
  email_unsubscribe_token: string | null
  email_opted_out_at: string | null
}

export interface DbCouple {
  id: string
  name: string | null
  relationship_start_date: string | null
  settings: Record<string, unknown>
  created_at: string
}

export interface DbCoupleInvite {
  id: string
  couple_id: string
  invited_by: string
  invited_email: string
  token: string
  status: 'pending' | 'accepted' | 'expired'
  created_at: string
  expires_at: string
}

export interface DbCheckIn {
  id: string
  couple_id: string
  started_at: string
  completed_at: string | null
  status: 'in-progress' | 'completed' | 'abandoned'
  categories: string[]
  mood_before: number | null
  mood_after: number | null
  reflection: string | null
}

export interface DbNote {
  id: string
  couple_id: string
  author_id: string
  check_in_id: string | null
  content: string
  privacy: 'private' | 'shared' | 'draft'
  tags: string[]
  category_id: string | null
  created_at: string
  updated_at: string
}

export interface DbActionItem {
  id: string
  couple_id: string
  check_in_id: string | null
  title: string
  description: string | null
  assigned_to: string | null
  due_date: string | null
  completed: boolean
  completed_at: string | null
  created_at: string
}

export interface DbMilestone {
  id: string
  couple_id: string
  title: string
  description: string | null
  category: 'relationship' | 'communication' | 'intimacy' | 'growth' | 'adventure' | 'milestone' | 'custom'
  icon: string | null
  achieved_at: string | null
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  points: number
  photo_url: string | null
}

export interface DbReminder {
  id: string
  couple_id: string
  created_by: string
  title: string
  message: string | null
  category: 'habit' | 'check-in' | 'action-item' | 'special-date' | 'custom'
  frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'custom'
  scheduled_for: string
  is_active: boolean
  notification_channel: 'in-app' | 'email' | 'both' | 'none'
  custom_schedule: Record<string, unknown> | null
  is_snoozed: boolean
  snooze_until: string | null
  last_notified_at: string | null
  assigned_to: string | null
  related_check_in_id: string | null
  related_action_item_id: string | null
  converted_from_request_id: string | null
}

export interface DbRequest {
  id: string
  couple_id: string
  requested_by: string
  requested_for: string
  title: string
  description: string | null
  category: 'activity' | 'task' | 'reminder' | 'conversation' | 'date-night' | 'custom'
  priority: 'low' | 'medium' | 'high'
  status: 'pending' | 'accepted' | 'declined' | 'converted'
  suggested_date: string | null
  created_at: string
  converted_to_reminder_id: string | null
}

export interface DbLoveLanguage {
  id: string
  couple_id: string
  user_id: string
  title: string
  description: string | null
  category: 'words' | 'acts' | 'gifts' | 'time' | 'touch' | 'custom'
  privacy: 'private' | 'shared'
  importance: 'low' | 'medium' | 'high' | 'essential'
  examples: string[]
  tags: string[]
  created_at: string
  updated_at: string
}

export interface DbLoveAction {
  id: string
  couple_id: string
  linked_language_id: string | null
  title: string
  description: string | null
  status: 'suggested' | 'planned' | 'completed' | 'recurring'
  frequency: 'once' | 'weekly' | 'monthly' | 'surprise'
  difficulty: 'easy' | 'moderate' | 'challenging'
  completed_count: number
  last_completed_at: string | null
  created_at: string
}

export interface DbSessionSettings {
  id: string
  couple_id: string
  session_duration: number
  timeouts_per_partner: number
  timeout_duration: number
  turn_based_mode: boolean
  turn_duration: number
  allow_extensions: boolean
  warm_up_questions: boolean
  cool_down_time: number
  pause_notifications: boolean
  auto_save_drafts: boolean
  version: number
  agreed_by: string[]
}

export interface DbSessionSettingsProposal {
  id: string
  couple_id: string
  proposed_by: string
  proposed_at: string
  settings: Record<string, unknown>
  status: 'pending' | 'accepted' | 'rejected'
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
}

export interface DbCategory {
  id: string
  couple_id: string
  name: string
  description: string | null
  icon: string
  is_active: boolean
  is_system: boolean
  sort_order: number
  prompts: string[]
  created_at: string
}

// WT-4 Cross-Feature Linking: Love language discovery system
export interface DbLoveLanguageDiscovery {
  id: string
  couple_id: string
  user_id: string
  check_in_id: string | null
  discovery: string
  converted_to_language_id: string | null
  created_at: string
}

export interface DbWaitlist {
  id: string
  email: string
  name: string | null
  source: string | null
  created_at: string
}
