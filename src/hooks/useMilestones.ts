'use client'

import { useState, useEffect, useCallback } from 'react'

import { createClient } from '@/lib/supabase/client'
import { hapticFeedback } from '@/lib/haptics'
import { milestoneSchema, validate } from '@/lib/validation'
import type { Milestone, MilestoneCategory, MilestoneRarity } from '@/types'
import {
  dbRowToMilestone,
  enforceMilestoneCap,
  fetchMilestones,
  uploadMilestonePhoto,
  buildDbUpdates,
  sendMilestoneEmailAsync,
} from './milestone-helpers'

export interface MilestoneInput {
  title: string
  description: string
  category: MilestoneCategory
  icon: string
  photoFile?: File
  rarity?: MilestoneRarity
  points?: number
}

export interface UseMilestonesReturn {
  milestones: Milestone[]
  isLoading: boolean
  error: string | null
  createMilestone: (input: MilestoneInput) => Promise<Milestone>
  updateMilestone: (id: string, updates: Partial<Milestone>) => Promise<Milestone>
  deleteMilestone: (id: string) => Promise<void>
  achieveMilestone: (id: string) => Promise<Milestone>
  uploadPhoto: (milestoneId: string, file: File) => Promise<string>
  getMilestonesByCategory: (category: MilestoneCategory) => Milestone[]
  getAchievedMilestones: () => Milestone[]
  getUpcomingMilestones: () => Milestone[]
  refresh: () => Promise<void>
}

export function useMilestones(coupleId: string | null): UseMilestonesReturn {
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const loadMilestones = useCallback(async () => {
    if (!coupleId) {
      setMilestones([])
      setIsLoading(false)
      return
    }
    try {
      setIsLoading(true)
      setError(null)
      setMilestones(await fetchMilestones(supabase, coupleId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load milestones')
    } finally {
      setIsLoading(false)
    }
  }, [coupleId, supabase])

  useEffect(() => {
    void loadMilestones()
  }, [loadMilestones])

  const uploadPhoto = useCallback(
    async (milestoneId: string, file: File): Promise<string> => {
      return uploadMilestonePhoto(supabase, coupleId, milestoneId, file)
    },
    [coupleId, supabase],
  )

  const createMilestone = useCallback(
    async (input: MilestoneInput): Promise<Milestone> => {
      if (!coupleId) throw new Error('No couple linked')
      await enforceMilestoneCap(supabase, coupleId)

      try {
        setError(null)

        const { error: validationError } = validate(milestoneSchema, {
          title: input.title,
          description: input.description,
          category: input.category,
          icon: input.icon,
          rarity: input.rarity,
          points: input.points,
        })
        if (validationError) throw new Error(validationError)

        const { data, error: insertError } = await supabase
          .from('milestones')
          .insert({
            couple_id: coupleId,
            title: input.title,
            description: input.description,
            category: input.category,
            icon: input.icon,
            rarity: input.rarity ?? 'common',
            points: input.points ?? 10,
          })
          .select()
          .single()
        if (insertError) throw insertError

        let photoUrl: string | null = null
        if (input.photoFile) {
          photoUrl = await uploadPhoto(data.id as string, input.photoFile)
          await supabase.from('milestones').update({ photo_url: photoUrl }).eq('id', data.id)
        }
        const milestone = dbRowToMilestone({ ...data, photo_url: photoUrl ?? data.photo_url })
        setMilestones((prev) => [milestone, ...prev])

        // Send milestone email to both partners (non-blocking)
        void sendMilestoneEmailAsync(milestone.id)

        hapticFeedback.milestoneReached()
        return milestone
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create milestone'
        setError(message)
        throw new Error(message)
      }
    },
    [coupleId, supabase, uploadPhoto],
  )

  const updateMilestone = useCallback(
    async (id: string, updates: Partial<Milestone>): Promise<Milestone> => {
      try {
        setError(null)
        const { data, error: updateError } = await supabase
          .from('milestones')
          .update(buildDbUpdates(updates))
          .eq('id', id)
          .select()
          .single()
        if (updateError) throw updateError
        const milestone = dbRowToMilestone(data)
        setMilestones((prev) => prev.map((m) => (m.id === id ? milestone : m)))
        return milestone
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update milestone'
        setError(message)
        throw new Error(message)
      }
    },
    [supabase],
  )

  const deleteMilestone = useCallback(
    async (id: string): Promise<void> => {
      try {
        setError(null)
        const { error: deleteError } = await supabase.from('milestones').delete().eq('id', id)
        if (deleteError) throw deleteError
        setMilestones((prev) => prev.filter((m) => m.id !== id))
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete milestone'
        setError(message)
        throw new Error(message)
      }
    },
    [supabase],
  )

  const achieveMilestone = useCallback(
    async (id: string): Promise<Milestone> => updateMilestone(id, { achievedAt: new Date().toISOString() }),
    [updateMilestone],
  )

  const queries = useMilestoneQueries(milestones)

  return {
    milestones,
    isLoading,
    error,
    createMilestone,
    updateMilestone,
    deleteMilestone,
    achieveMilestone,
    uploadPhoto,
    ...queries,
    refresh: loadMilestones,
  }
}

function useMilestoneQueries(milestones: Milestone[]) {
  const getMilestonesByCategory = useCallback(
    (category: MilestoneCategory) => milestones.filter((m) => m.category === category),
    [milestones],
  )
  const getAchievedMilestones = useCallback(() => milestones.filter((m) => m.achievedAt !== null), [milestones])
  const getUpcomingMilestones = useCallback(() => milestones.filter((m) => m.achievedAt === null), [milestones])
  return { getMilestonesByCategory, getAchievedMilestones, getUpcomingMilestones }
}
