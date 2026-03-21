import type { SupabaseClient } from '@supabase/supabase-js'

import { createClient } from '@/lib/supabase/client'
import type { Milestone, MilestoneCategory, MilestoneRarity } from '@/types'

export function dbRowToMilestone(row: Record<string, unknown>): Milestone {
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

export async function fetchMilestones(
  supabase: ReturnType<typeof createClient>,
  coupleId: string,
): Promise<Milestone[]> {
  const { data, error } = await supabase
    .from('milestones')
    .select('*')
    .eq('couple_id', coupleId)
    .order('achieved_at', { ascending: false, nullsFirst: false })

  if (error) throw error
  const milestones = (data ?? []).map(dbRowToMilestone)
  return resolveSignedUrls(supabase, milestones)
}

/**
 * Replace stored photo paths/URLs with short-lived signed URLs for display.
 * Milestones without a photoUrl are left unchanged.
 */
export async function resolveSignedUrls(
  supabase: ReturnType<typeof createClient>,
  milestones: Milestone[],
): Promise<Milestone[]> {
  const withPhotos = milestones.filter((m) => m.photoUrl !== null)
  if (withPhotos.length === 0) return milestones

  const signed = await Promise.all(
    withPhotos.map(async (m) => {
      const url = await getMilestonePhotoUrl(supabase, m.photoUrl!)
      return { id: m.id, url }
    }),
  )

  const urlMap = new Map(signed.map((s) => [s.id, s.url]))
  return milestones.map((m) => {
    if (!m.photoUrl) return m
    const signedUrl = urlMap.get(m.id)
    return signedUrl ? { ...m, photoUrl: signedUrl } : m
  })
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

export async function uploadMilestonePhoto(
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

  // Return the relative storage path (bucket is private; use getMilestonePhotoUrl for signed URLs)
  return path
}

export async function getMilestonePhotoUrl(supabase: SupabaseClient, photoPath: string): Promise<string | null> {
  // Handle legacy full URLs by extracting the path
  const path = photoPath.includes('/storage/v1/object/public/milestone-photos/')
    ? photoPath.split('/storage/v1/object/public/milestone-photos/')[1]
    : photoPath.startsWith('milestone-photos/')
      ? photoPath.replace('milestone-photos/', '')
      : photoPath

  const { data, error } = await supabase.storage.from('milestone-photos').createSignedUrl(path, 3600)

  if (error) return null
  return data.signedUrl
}

export function buildDbUpdates(updates: Partial<Milestone>): Record<string, unknown> {
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

export async function enforceMilestoneCap(supabase: ReturnType<typeof createClient>, coupleId: string): Promise<void> {
  const { count } = await supabase
    .from('milestones')
    .select('*', { count: 'exact', head: true })
    .eq('couple_id', coupleId)

  if (count !== null && count >= 200) {
    throw new Error('You\u2019ve reached the maximum of 200 milestones. Delete some to create new ones.')
  }
}

export async function sendMilestoneEmailAsync(milestoneId: string): Promise<void> {
  try {
    const mod = await import('@/app/(app)/growth/actions')
    await mod.sendMilestoneEmail(milestoneId)
  } catch {
    // Email send failed -- non-blocking
  }
}
