import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

import { createAdminClient } from '@/lib/supabase/admin'

const BUCKET = 'milestone-photos'
const GRACE_PERIOD_MS = 24 * 60 * 60 * 1000 // 24 hours

function timingSafeCompare(a: string, b: string): boolean {
  const hashA = crypto.createHash('sha256').update(a).digest()
  const hashB = crypto.createHash('sha256').update(b).digest()
  return crypto.timingSafeEqual(hashA, hashB)
}

function extractStoragePath(photoUrl: string): string | null {
  // photo_url may be a full URL or a relative storage path
  // Full URL pattern: .../storage/v1/object/public/milestone-photos/<path>
  const fullUrlMatch = photoUrl.match(/\/storage\/v1\/object\/public\/milestone-photos\/(.+)$/)
  if (fullUrlMatch) {
    return fullUrlMatch[1]
  }

  // If it's already a relative path (no protocol), return as-is
  if (!photoUrl.startsWith('http')) {
    return photoUrl
  }

  return null
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization')
  const expectedHeader = `Bearer ${process.env.CRON_SECRET}`

  if (!authHeader || !process.env.CRON_SECRET || !timingSafeCompare(authHeader, expectedHeader)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const now = Date.now()

  // List all objects in the milestone-photos bucket
  const { data: storageObjects, error: listError } = await supabase.storage.from(BUCKET).list('', {
    limit: 1000,
    sortBy: { column: 'created_at', order: 'asc' },
  })

  if (listError) {
    console.error('[cron/cleanup-storage] Failed to list storage objects:', listError.message)
    return NextResponse.json({ error: 'Failed to list storage objects' }, { status: 500 })
  }

  if (!storageObjects || storageObjects.length === 0) {
    return NextResponse.json({
      status: 'ok',
      checked: 0,
      deleted: 0,
      skipped: 0,
      timestamp: new Date().toISOString(),
    })
  }

  // Query all photo_url values from milestones
  const { data: milestones, error: queryError } = await supabase
    .from('milestones')
    .select('photo_url')
    .not('photo_url', 'is', null)

  if (queryError) {
    console.error('[cron/cleanup-storage] Failed to query milestones:', queryError.message)
    return NextResponse.json({ error: 'Failed to query milestones' }, { status: 500 })
  }

  // Build a set of referenced storage paths for fast lookup
  const referencedPaths = new Set<string>()
  for (const milestone of milestones ?? []) {
    if (milestone.photo_url) {
      const path = extractStoragePath(milestone.photo_url)
      if (path) {
        referencedPaths.add(path)
      }
    }
  }

  // Identify orphaned objects (not referenced and older than grace period)
  const orphanedPaths: string[] = []
  let skipped = 0

  for (const obj of storageObjects) {
    // Skip folders (they have no id)
    if (!obj.id) continue

    const objectPath = obj.name

    // Skip if referenced by a milestone
    if (referencedPaths.has(objectPath)) continue

    // Skip if within grace period (protect in-progress uploads)
    const createdAt = new Date(obj.created_at).getTime()
    if (now - createdAt < GRACE_PERIOD_MS) {
      skipped++
      continue
    }

    orphanedPaths.push(objectPath)
  }

  // Delete orphaned objects
  let deleted = 0
  const errors: string[] = []

  if (orphanedPaths.length > 0) {
    const { error: deleteError } = await supabase.storage.from(BUCKET).remove(orphanedPaths)

    if (deleteError) {
      console.error('[cron/cleanup-storage] Failed to delete orphaned objects:', deleteError.message)
      errors.push(deleteError.message)
    } else {
      deleted = orphanedPaths.length
    }
  }

  return NextResponse.json({
    status: 'ok',
    checked: storageObjects.length,
    deleted,
    skipped,
    errors: errors.length > 0 ? errors : undefined,
    timestamp: new Date().toISOString(),
  })
}
