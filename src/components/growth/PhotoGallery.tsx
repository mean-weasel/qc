'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import { Plus, Heart, Calendar, Award } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { StaggerContainer, StaggerItem } from '@/components/ui/motion'
import { format, parseISO } from 'date-fns'
import type { Milestone } from '@/types'

interface PhotoGalleryProps {
  milestones: Milestone[]
  onAddMemory?: () => void
}

export function PhotoGallery({ milestones, onAddMemory }: PhotoGalleryProps): React.ReactElement {
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null)
  const [filter, setFilter] = useState<'all' | 'photos'>('all')

  const milestonesWithPhotos = useMemo(() => {
    return milestones.filter((m) => m.photoUrl !== null)
  }, [milestones])

  const displayItems = filter === 'photos' ? milestonesWithPhotos : milestones.filter((m) => m.photoUrl || m.icon)

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            className="min-h-[44px]"
            onClick={() => setFilter('all')}
          >
            All ({milestones.length})
          </Button>
          <Button
            variant={filter === 'photos' ? 'default' : 'outline'}
            size="sm"
            className="min-h-[44px]"
            onClick={() => setFilter('photos')}
          >
            <Heart className="mr-1 h-4 w-4" />
            Photos ({milestonesWithPhotos.length})
          </Button>
        </div>
        {onAddMemory && (
          <Button onClick={onAddMemory} size="sm" className="min-h-[44px]">
            <Plus className="mr-2 h-4 w-4" />
            Add Memory
          </Button>
        )}
      </div>

      {/* Photo grid */}
      {displayItems.length === 0 ? (
        <div className="py-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
            <Award className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-gray-100">No memories yet</h3>
          <p className="mx-auto max-w-sm text-gray-600 dark:text-gray-400">
            Add photos to your milestones to build your memory gallery.
          </p>
        </div>
      ) : (
        <StaggerContainer className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {displayItems.map((milestone) => (
            <StaggerItem key={milestone.id}>
              <button
                className="group relative aspect-[4/3] w-full cursor-pointer overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800"
                onClick={() => setSelectedMilestone(milestone)}
              >
                {milestone.photoUrl ? (
                  <Image
                    src={milestone.photoUrl}
                    alt={milestone.title}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-pink-100 to-purple-100 dark:from-pink-900/30 dark:to-purple-900/30">
                    <span className="text-4xl">{milestone.icon ?? '🏆'}</span>
                  </div>
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                    <p className="line-clamp-1 text-sm font-semibold">{milestone.title}</p>
                    {milestone.achievedAt && (
                      <p className="mt-1 text-xs opacity-90">{format(parseISO(milestone.achievedAt), 'MMM d, yyyy')}</p>
                    )}
                  </div>
                </div>

                {/* Rarity badge */}
                {milestone.rarity !== 'common' && (
                  <div className="absolute left-2 top-2">
                    <Badge className="bg-purple-500 text-xs text-white">{milestone.rarity}</Badge>
                  </div>
                )}
              </button>
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}

      {/* Lightbox dialog */}
      <Dialog open={selectedMilestone !== null} onOpenChange={() => setSelectedMilestone(null)}>
        <DialogContent className="max-w-2xl">
          {selectedMilestone && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedMilestone.title}</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {selectedMilestone.photoUrl ? (
                  <div className="relative aspect-video w-full">
                    <Image
                      src={selectedMilestone.photoUrl}
                      alt={selectedMilestone.title}
                      fill
                      sizes="(max-width: 672px) 100vw, 672px"
                      className="rounded-lg object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-48 items-center justify-center rounded-lg bg-gradient-to-br from-pink-100 to-purple-100 dark:from-pink-900/30 dark:to-purple-900/30">
                    <span className="text-7xl">{selectedMilestone.icon ?? '🏆'}</span>
                  </div>
                )}

                <p className="text-gray-600 dark:text-gray-400">{selectedMilestone.description}</p>

                <div className="flex flex-wrap gap-3 text-sm text-gray-500">
                  {selectedMilestone.achievedAt && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {format(parseISO(selectedMilestone.achievedAt), 'MMMM d, yyyy')}
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Award className="h-4 w-4" />
                    {selectedMilestone.points} points
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {selectedMilestone.category}
                  </Badge>
                  {selectedMilestone.rarity !== 'common' && (
                    <Badge variant="outline" className="capitalize">
                      {selectedMilestone.rarity}
                    </Badge>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
