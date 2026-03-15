import { describe, it, expect, vi } from 'vitest'

import { getISOWeekKey, calculateStreakFromDates, getAchievedMilestone, getStreakData } from './streaks'

describe('getISOWeekKey', () => {
  it('returns correct ISO week for a known Monday', () => {
    // Jan 6, 2025 is a Monday in ISO week 2
    expect(getISOWeekKey(new Date(2025, 0, 6))).toBe('2025-W02')
  })

  it('handles year boundary where Monday falls in next years ISO week 1', () => {
    // Dec 30, 2024 is a Monday that belongs to ISO week 1 of 2025
    expect(getISOWeekKey(new Date(2024, 11, 30))).toBe('2025-W01')
  })
})

describe('calculateStreakFromDates', () => {
  it('returns zeros and null for empty array', () => {
    const result = calculateStreakFromDates([])
    expect(result).toEqual({
      currentStreak: 0,
      longestStreak: 0,
      lastCheckInDate: null,
      totalCheckIns: 0,
    })
  })

  it('counts totalCheckIns correctly', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-03-12T12:00:00Z'))
    const dates = ['2025-03-10T10:00:00Z', '2025-03-05T10:00:00Z', '2025-02-26T10:00:00Z']
    const result = calculateStreakFromDates(dates)
    expect(result.totalCheckIns).toBe(3)
    vi.useRealTimers()
  })

  it('returns the most recent date as lastCheckInDate even when unsorted', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-03-12T12:00:00Z'))
    const dates = ['2025-01-15T10:00:00Z', '2025-03-10T10:00:00Z', '2025-02-20T10:00:00Z']
    const result = calculateStreakFromDates(dates)
    expect(result.lastCheckInDate).toBe('2025-03-10T10:00:00Z')
    vi.useRealTimers()
  })

  it('returns currentStreak >= 1 for a single date', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-03-12T12:00:00Z'))
    const result = calculateStreakFromDates(['2025-03-10T10:00:00Z'])
    expect(result.currentStreak).toBeGreaterThanOrEqual(1)
    vi.useRealTimers()
  })
})

describe('getAchievedMilestone', () => {
  it('returns null below the 4-week threshold', () => {
    expect(getAchievedMilestone(3)).toBeNull()
  })

  it('returns 1 Month milestone at exactly 4 weeks', () => {
    const milestone = getAchievedMilestone(4)
    expect(milestone).not.toBeNull()
    expect(milestone?.label).toBe('1 Month')
  })
})

describe('getStreakData', () => {
  it('returns default zeros when query errors', async () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              not: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: null, error: { message: 'fail' } }),
                }),
              }),
            }),
          }),
        }),
      }),
    } as never

    const result = await getStreakData('couple-123', supabase)
    expect(result).toEqual({
      currentStreak: 0,
      longestStreak: 0,
      lastCheckInDate: null,
      totalCheckIns: 0,
    })
  })
})
