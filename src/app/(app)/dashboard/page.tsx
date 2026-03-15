import type { SupabaseClient } from '@supabase/supabase-js'

import { requireAuth } from '@/lib/auth'
import { getStreakData } from '@/lib/streaks'
import { getRecentActivity } from '@/lib/activity'
import type { StreakData } from '@/lib/streaks'
import type { ActivityItem } from '@/lib/activity'

import { DashboardContent } from './dashboard-content'

export const metadata = {
  title: 'Dashboard',
}

interface DashboardData {
  checkInCount: number
  noteCount: number
  milestoneCount: number
  actionItemCount: number
  totalLanguages: number
  sharedLanguages: number
  streakData: StreakData
  activities: ActivityItem[]
  relationshipStartDate: string | null
  lastCheckInDate: string | null
  topLanguages: Array<{ title: string; category: string }>
  todayReminders: Array<{ id: string; title: string; scheduledFor: string; category: string; isOverdue: boolean }>
  pendingRequestCount: number
  partnerTopLanguage: { title: string; category: string } | null
  todayActionCount: number
  frequencyGoal: string | null
}

interface RpcReminder {
  id: string
  title: string
  scheduled_for: string
  category: string
  is_overdue: boolean
}

interface RpcSummary {
  check_in_count: number
  note_count: number
  milestone_count: number
  action_item_count: number
  total_languages: number
  shared_languages: number
  today_action_count: number
  relationship_start_date: string | null
  frequency_goal: string | null
  last_check_in_date: string | null
  top_languages: Array<{ title: string; category: string }>
  partner_top_language: { title: string; category: string } | null
  today_reminders: RpcReminder[]
  pending_request_count: number
}

async function fetchDashboardData(coupleId: string, userId: string, supabase: SupabaseClient): Promise<DashboardData> {
  const [summary, streak, activity] = await Promise.all([
    supabase.rpc('get_dashboard_summary', { p_couple_id: coupleId, p_user_id: userId }),
    getStreakData(coupleId, supabase),
    getRecentActivity(coupleId, userId, supabase, 20),
  ])

  if (summary.error) {
    console.error('[dashboard] RPC error:', summary.error.message)
  }

  const data = summary.data as RpcSummary | null

  return {
    checkInCount: data?.check_in_count ?? 0,
    noteCount: data?.note_count ?? 0,
    milestoneCount: data?.milestone_count ?? 0,
    actionItemCount: data?.action_item_count ?? 0,
    totalLanguages: data?.total_languages ?? 0,
    sharedLanguages: data?.shared_languages ?? 0,
    streakData: streak,
    activities: activity,
    relationshipStartDate: data?.relationship_start_date ?? null,
    frequencyGoal: data?.frequency_goal ?? null,
    lastCheckInDate: data?.last_check_in_date ?? null,
    topLanguages: data?.top_languages ?? [],
    todayReminders: (data?.today_reminders ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      scheduledFor: r.scheduled_for,
      category: r.category,
      isOverdue: r.is_overdue,
    })),
    pendingRequestCount: data?.pending_request_count ?? 0,
    partnerTopLanguage: data?.partner_top_language ?? null,
    todayActionCount: data?.today_action_count ?? 0,
  }
}

const DEFAULTS: DashboardData = {
  checkInCount: 0,
  noteCount: 0,
  milestoneCount: 0,
  actionItemCount: 0,
  totalLanguages: 0,
  sharedLanguages: 0,
  streakData: { currentStreak: 0, longestStreak: 0, lastCheckInDate: null, totalCheckIns: 0 },
  activities: [],
  relationshipStartDate: null,
  lastCheckInDate: null,
  topLanguages: [],
  todayReminders: [],
  pendingRequestCount: 0,
  partnerTopLanguage: null,
  todayActionCount: 0,
  frequencyGoal: null,
}

export default async function DashboardPage() {
  const { user, supabase } = await requireAuth()
  const { data: profile } = await supabase.from('profiles').select('couple_id').eq('id', user.id).single()
  const coupleId = profile?.couple_id
  const data = coupleId ? await fetchDashboardData(coupleId, user.id, supabase) : DEFAULTS

  return <DashboardContent {...data} hasCoupleId={!!coupleId} />
}
