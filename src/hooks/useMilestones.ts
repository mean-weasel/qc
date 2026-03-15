'use client'

import { useState, useEffect, useCallback } from 'react'

import { createClient } from '@/lib/supabase/client'
import { hapticFeedback } from '@/lib/haptics'
import { milestoneSchema, validate } from '@/lib/validation'
import type { Milestone, MilestoneCategory, MilestoneRarity } from '@/types'

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

function dbRowToMilestone(row: Record<string, unknown>): Milestone {
  return {
    id: row.id as string,
    coupleId: row.couple_id as string,
    title: row.title as string,
    description: (row.description as string) ?? null,
    category: row.category as MilestoneCategory,
    icon: (row.icon as string) ?? null,
    achievedAt: (row.achieved_at as string) ?? null,
    rarity: row.rarity as MilestoneRarity,
    points: row.points as number,
    photoUrl: (row.photo_url as string) ?? null,
  }
}

async function fetchMilestones(supabase: ReturnType<typeof createClient>, coupleId: string): Promise<Milestone[]> {
  const { data, error } = await supabase
    .from('milestones')
    .select('*')
    .eq('couple_id', coupleId)
    .order('achieved_at', { ascending: false, nullsFirst: false })

  if (error) throw error
  return (data ?? []).map(dbRowToMilestone)
}

const IMAGE_MAGIC_BYTES: Record<string, number[]> = {
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/png': [0x89, 0x50, 0x4e, 0x47],
  'image/webp': [0x52, 0x49, 0x46, 0x46],
}

async function validateImageMagicBytes(file: File): Promise<boolean> {
  const buffer = await file.slice(0, 8).arrayBuffer()
  const bytes = new Uint8Array(buffer)
  return Object.values(IMAGE_MAGIC_BYTES).some((magic) => magic.every((byte, i) => bytes[i] === byte))
}

const MAX_PHOTO_SIZE = 10 * 1024 * 1024 // 10 MB

async function uploadMilestonePhoto(
  supabase: ReturnType<typeof createClient>,
  coupleId: string | null,
  milestoneId: string,
  file: File,
): Promise<string> {
  if (file.size > MAX_PHOTO_SIZE) {
    throw new Error(`Photo must be under 10 MB (yours is ${(file.size / 1024 / 1024).toFixed(1)} MB)`)
  }

  const isValidImage = await validateImageMagicBytes(file)
  if (!isValidImage) {
    throw new Error("This file doesn't appear to be a valid image")
  }

  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${coupleId}/${milestoneId}.${ext}`

  const { error } = await supabase.storage.from('milestone-photos').upload(path, file, { upsert: true })
  if (error) throw error

  const {
    data: { publicUrl },
  } = supabase.storage.from('milestone-photos').getPublicUrl(path)
  return publicUrl
}

function buildDbUpdates(updates: Partial<Milestone>): Record<string, unknown> {
  const dbUpdates: Record<string, unknown> = {}
  if (updates.title !== undefined) dbUpdates.title = updates.title
  if (updates.description !== undefined) dbUpdates.description = updates.description
  if (updates.category !== undefined) dbUpdates.category = updates.category
  if (updates.icon !== undefined) dbUpdates.icon = updates.icon
  if (updates.achievedAt !== undefined) dbUpdates.achieved_at = updates.achievedAt
  if (updates.rarity !== undefined) dbUpdates.rarity = updates.rarity
  if (updates.points !== undefined) dbUpdates.points = updates.points
  if (updates.photoUrl !== undefined) dbUpdates.photo_url = updates.photoUrl
  return dbUpdates
}

async function sendMilestoneEmailAsync(milestoneId: string): Promise<void> {
  try {
    const mod = await import('@/app/(app)/growth/actions')
    await mod.sendMilestoneEmail(milestoneId)
  } catch {
    // Email send failed -- non-blocking
  }
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

  const getMilestonesByCategory = useCallback(
    (category: MilestoneCategory) => milestones.filter((m) => m.category === category),
    [milestones],
  )
  const getAchievedMilestones = useCallback(() => milestones.filter((m) => m.achievedAt !== null), [milestones])
  const getUpcomingMilestones = useCallback(() => milestones.filter((m) => m.achievedAt === null), [milestones])

  return {
    milestones,
    isLoading,
    error,
    createMilestone,
    updateMilestone,
    deleteMilestone,
    achieveMilestone,
    uploadPhoto,
    getMilestonesByCategory,
    getAchievedMilestones,
    getUpcomingMilestones,
    refresh: loadMilestones,
  }
}
