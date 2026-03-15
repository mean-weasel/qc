import type { SupabaseClient } from '@supabase/supabase-js'

export interface ActivityItem {
  type: 'check-in' | 'note' | 'milestone' | 'action-item' | 'request'
  title: string
  description: string
  timestamp: string
}

export async function getRecentActivity(
  coupleId: string,
  userId: string,
  supabase: SupabaseClient,
  limit = 5,
): Promise<ActivityItem[]> {
  const [checkIns, notes, milestones, actionItems, requests] = await Promise.all([
    supabase
      .from('check_ins')
      .select('completed_at, categories')
      .eq('couple_id', coupleId)
      .eq('status', 'completed')
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(3),

    supabase
      .from('notes')
      .select('content, created_at, privacy, author_id')
      .eq('couple_id', coupleId)
      .or(`privacy.eq.shared,author_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(3),

    supabase
      .from('milestones')
      .select('title, achieved_at, created_at')
      .eq('couple_id', coupleId)
      .order('created_at', { ascending: false })
      .limit(3),

    supabase
      .from('action_items')
      .select('title, completed_at')
      .eq('couple_id', coupleId)
      .eq('completed', true)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(3),

    supabase
      .from('requests')
      .select('title, created_at')
      .eq('couple_id', coupleId)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false })
      .limit(3),
  ])

  const items: ActivityItem[] = []

  if (checkIns.data) {
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    for (const row of checkIns.data) {
      const categories = ((row.categories as string[]) ?? []).filter((c) => !UUID_RE.test(c))
      items.push({
        type: 'check-in',
        title: 'Check-in completed',
        description: categories.length > 0 ? categories.join(', ') : 'General check-in',
        timestamp: row.completed_at as string,
      })
    }
  }

  if (notes.data) {
    for (const row of notes.data) {
      const content = (row.content as string) ?? ''
      items.push({
        type: 'note',
        title: content.length > 50 ? `${content.slice(0, 50)}...` : content,
        description: '',
        timestamp: row.created_at as string,
      })
    }
  }

  if (milestones.data) {
    for (const row of milestones.data) {
      items.push({
        type: 'milestone',
        title: row.title as string,
        description: '',
        timestamp: (row.achieved_at as string) ?? (row.created_at as string),
      })
    }
  }

  if (actionItems.data) {
    for (const row of actionItems.data) {
      items.push({
        type: 'action-item',
        title: row.title as string,
        description: 'Completed',
        timestamp: row.completed_at as string,
      })
    }
  }

  if (requests.data) {
    for (const row of requests.data) {
      items.push({
        type: 'request',
        title: row.title as string,
        description: '',
        timestamp: row.created_at as string,
      })
    }
  }

  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return items.slice(0, limit)
}
