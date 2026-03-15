import type { SupabaseClient } from '@supabase/supabase-js'

export interface StreakData {
  currentStreak: number
  longestStreak: number
  lastCheckInDate: string | null
  totalCheckIns: number
}

export const STREAK_MILESTONES = [
  { weeks: 4, label: '1 Month', emoji: '🔥' },
  { weeks: 8, label: '2 Months', emoji: '💪' },
  { weeks: 12, label: '3 Months', emoji: '⭐' },
  { weeks: 26, label: '6 Months', emoji: '🏆' },
  { weeks: 52, label: '1 Year', emoji: '👑' },
] as const

/**
 * Get the ISO week number for a date.
 * Returns a string like "2024-W03" for easy comparison.
 */
export function getISOWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

/**
 * Calculate streak data from an array of completed_at dates.
 * Exported for testing without Supabase dependency.
 */
export function calculateStreakFromDates(completedDates: string[]): StreakData {
  if (completedDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0, lastCheckInDate: null, totalCheckIns: 0 }
  }

  // Sort dates descending (most recent first)
  const sorted = [...completedDates].sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

  // Get unique ISO weeks
  const weeks = [...new Set(sorted.map((d) => getISOWeekKey(new Date(d))))]

  // weeks is already sorted descending because sorted dates produce descending weeks
  const currentWeek = getISOWeekKey(new Date())

  // Calculate current streak: count consecutive weeks starting from current or most recent
  let currentStreak = 0
  let expectedWeek = currentWeek

  for (const week of weeks) {
    if (week === expectedWeek) {
      currentStreak++
      // Move to previous week
      expectedWeek = getPreviousWeekKey(expectedWeek)
    } else if (week < expectedWeek) {
      // If we haven't started counting yet (first week isn't current week),
      // start from the most recent week
      if (currentStreak === 0) {
        currentStreak = 1
        expectedWeek = getPreviousWeekKey(week)
      } else {
        break
      }
    }
  }

  // Calculate longest streak across all history
  let longestStreak = 0
  let streakCount = 1

  for (let i = 1; i < weeks.length; i++) {
    const expected = getPreviousWeekKey(weeks[i - 1])
    // eslint-disable-next-line security/detect-object-injection -- i is a numeric loop index
    if (weeks[i] === expected) {
      streakCount++
    } else {
      longestStreak = Math.max(longestStreak, streakCount)
      streakCount = 1
    }
  }
  longestStreak = Math.max(longestStreak, streakCount)

  // If current streak is actually active (includes current week), it might be the longest
  longestStreak = Math.max(longestStreak, currentStreak)

  return {
    currentStreak,
    longestStreak,
    lastCheckInDate: sorted[0],
    totalCheckIns: completedDates.length,
  }
}

/**
 * Get the ISO week key for the previous week.
 */
function getPreviousWeekKey(weekKey: string): string {
  // Parse "2024-W03" format
  const [yearStr, weekStr] = weekKey.split('-W')
  const year = parseInt(yearStr, 10)
  const week = parseInt(weekStr, 10)

  if (week > 1) {
    return `${year}-W${String(week - 1).padStart(2, '0')}`
  }

  // Week 1 -> previous year's last week
  // ISO 8601: last week of year is either 52 or 53
  const dec28 = new Date(Date.UTC(year - 1, 11, 28))
  dec28.setUTCDate(dec28.getUTCDate() + 4 - (dec28.getUTCDay() || 7))
  const lastWeek = Math.ceil(
    ((dec28.getTime() - new Date(Date.UTC(dec28.getUTCFullYear(), 0, 1)).getTime()) / 86400000 + 1) / 7,
  )
  return `${year - 1}-W${String(lastWeek).padStart(2, '0')}`
}

/**
 * Fetch streak data for a couple from Supabase.
 */
export async function getStreakData(coupleId: string, supabase: SupabaseClient): Promise<StreakData> {
  const { data, error } = await supabase
    .from('check_ins')
    .select('completed_at')
    .eq('couple_id', coupleId)
    .eq('status', 'completed')
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(365)

  if (error) {
    console.error('Failed to fetch check-ins for streak:', error)
    return { currentStreak: 0, longestStreak: 0, lastCheckInDate: null, totalCheckIns: 0 }
  }

  const dates = (data ?? []).map((row: { completed_at: string }) => row.completed_at)
  return calculateStreakFromDates(dates)
}

/**
 * Get the highest achieved milestone for a streak count.
 */
export function getAchievedMilestone(streakWeeks: number): (typeof STREAK_MILESTONES)[number] | null {
  for (let i = STREAK_MILESTONES.length - 1; i >= 0; i--) {
    // eslint-disable-next-line security/detect-object-injection -- i is a numeric loop index
    if (streakWeeks >= STREAK_MILESTONES[i].weeks) {
      // eslint-disable-next-line security/detect-object-injection -- i is a numeric loop index
      return STREAK_MILESTONES[i]
    }
  }
  return null
}
