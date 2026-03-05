'use client'

import { useState } from 'react'
import { TrendingUp, Award, Target, Camera, Plus, BarChart3 } from 'lucide-react'

import { MotionBox, StaggerContainer, StaggerItem } from '@/components/ui/motion'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/button'
import { Timeline, PhotoGallery, MilestoneCreator } from '@/components/growth'
import { GrowthProgressBars } from '@/components/growth/GrowthProgressBars'
import dynamic from 'next/dynamic'

const HealthChart = dynamic(() => import('@/components/growth/HealthChart').then((m) => ({ default: m.HealthChart })), {
  loading: () => <div className="h-64 animate-pulse rounded-lg bg-muted" />,
})
import { useMilestones } from '@/hooks/useMilestones'
import { useRealtimeCouple } from '@/hooks/useRealtimeCouple'
import type { MilestoneInput } from '@/hooks/useMilestones'
import type { Milestone } from '@/types'
import type { DbMilestone } from '@/types/database'
import type { GrowthAreaScore } from '@/lib/growth-scoring'
import type { MoodDataPoint } from '@/lib/chart-data'

interface GrowthContentProps {
  coupleId: string | null
  growthScores: GrowthAreaScore[]
  moodHistory: MoodDataPoint[]
}

type ActiveView = 'timeline' | 'progress' | 'memories' | 'analytics'

interface StatsGridProps {
  achievedCount: number
  upcomingCount: number
  totalPoints: number
  photoCount: number
}

function StatsGrid({ achievedCount, upcomingCount, totalPoints, photoCount }: StatsGridProps): React.ReactElement {
  const stats = [
    { value: achievedCount, label: 'Milestones Reached', color: 'text-green-600' },
    { value: upcomingCount, label: 'In Progress', color: 'text-blue-600' },
    { value: totalPoints, label: 'Total Points', color: 'text-purple-600' },
    { value: photoCount, label: 'Photos', color: 'text-pink-600' },
  ]

  return (
    <StaggerContainer className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
      {stats.map((stat) => (
        <StaggerItem key={stat.label}>
          <div className="rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className={`mb-2 text-3xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</div>
          </div>
        </StaggerItem>
      ))}
    </StaggerContainer>
  )
}

interface ProgressViewProps {
  scores: GrowthAreaScore[]
  upcoming: Milestone[]
  achieved: Milestone[]
}

function ProgressView({ scores, upcoming, achieved }: ProgressViewProps): React.ReactElement {
  const totalMilestones = upcoming.length + achieved.length
  const completionRate = totalMilestones > 0 ? Math.round((achieved.length / totalMilestones) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Growth area progress bars */}
      {scores.length > 0 ? (
        <GrowthProgressBars scores={scores} />
      ) : (
        <div className="rounded-lg border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">Complete check-ins to see your growth area progress.</p>
        </div>
      )}

      {/* Milestone completion summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{achieved.length}</p>
          <p className="text-xs text-muted-foreground">Milestones Complete</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{upcoming.length}</p>
          <p className="text-xs text-muted-foreground">Milestones Upcoming</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-purple-600">{completionRate}%</p>
          <p className="text-xs text-muted-foreground">Completion Rate</p>
        </div>
      </div>
    </div>
  )
}

export function GrowthContent({ coupleId, growthScores, moodHistory }: GrowthContentProps): React.ReactElement {
  const [activeView, setActiveView] = useState<ActiveView>('timeline')
  const [isCreatorOpen, setIsCreatorOpen] = useState(false)

  const { milestones, isLoading, error, createMilestone, getAchievedMilestones, getUpcomingMilestones, refresh } =
    useMilestones(coupleId)

  // Realtime subscription for partner's milestone changes
  useRealtimeCouple<DbMilestone>({
    table: 'milestones',
    coupleId,
    onInsert: () => {
      void refresh()
    },
    onUpdate: () => {
      void refresh()
    },
    onDelete: () => {
      void refresh()
    },
  })

  const achieved = getAchievedMilestones()
  const upcoming = getUpcomingMilestones()
  const totalPoints = milestones.reduce((sum, m) => sum + m.points, 0)

  async function handleCreateMilestone(input: MilestoneInput): Promise<void> {
    await createMilestone(input)
  }

  if (!coupleId) {
    return (
      <div className="py-16 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-pink-100 dark:bg-pink-900/30">
          <TrendingUp className="h-8 w-8 text-pink-600" />
        </div>
        <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100">Connect with your partner</h2>
        <p className="mx-auto max-w-sm text-gray-600 dark:text-gray-400">
          Invite your partner to start tracking your relationship milestones together.
        </p>
      </div>
    )
  }

  const newMilestoneButton = (
    <Button
      onClick={() => setIsCreatorOpen(true)}
      className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
    >
      <Plus className="mr-1 h-4 w-4" />
      New Milestone
    </Button>
  )

  return (
    <MotionBox variant="page">
      <PageContainer
        title="Growth Gallery"
        description="Track your relationship journey and celebrate your achievements together."
        action={newMilestoneButton}
        className="space-y-8"
      >
        <StatsGrid
          achievedCount={achieved.length}
          upcomingCount={upcoming.length}
          totalPoints={totalPoints}
          photoCount={milestones.filter((m) => m.photoUrl).length}
        />

        {/* View Toggle */}
        <div className="flex overflow-x-auto px-1">
          <div className="flex min-w-max flex-shrink-0 gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
            <Button
              variant={activeView === 'timeline' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveView('timeline')}
              className="min-h-[44px] rounded-md text-xs sm:text-sm"
            >
              <Award className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
              Timeline
            </Button>
            <Button
              variant={activeView === 'progress' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveView('progress')}
              className="min-h-[44px] rounded-md text-xs sm:text-sm"
            >
              <Target className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
              Progress
            </Button>
            <Button
              variant={activeView === 'memories' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveView('memories')}
              className="min-h-[44px] rounded-md text-xs sm:text-sm"
            >
              <Camera className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
              Memories
            </Button>
            <Button
              variant={activeView === 'analytics' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveView('analytics')}
              className="min-h-[44px] rounded-md text-xs sm:text-sm"
            >
              <BarChart3 className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
              Analytics
            </Button>
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-200 border-t-pink-600" />
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-center text-sm text-red-600 dark:bg-red-900/20">{error}</div>
        )}

        {/* Content views */}
        {!isLoading && !error && (
          <>
            {activeView === 'timeline' && <Timeline milestones={milestones} />}
            {activeView === 'progress' && (
              <ProgressView scores={growthScores} upcoming={upcoming} achieved={achieved} />
            )}
            {activeView === 'memories' && (
              <PhotoGallery milestones={milestones} onAddMemory={() => setIsCreatorOpen(true)} />
            )}
            {activeView === 'analytics' && <AnalyticsView scores={growthScores} moodHistory={moodHistory} />}
          </>
        )}

        {/* Milestone creator modal */}
        <MilestoneCreator
          isOpen={isCreatorOpen}
          onClose={() => setIsCreatorOpen(false)}
          onSubmit={handleCreateMilestone}
        />
      </PageContainer>
    </MotionBox>
  )
}

function AnalyticsView({
  scores,
  moodHistory,
}: {
  scores: GrowthAreaScore[]
  moodHistory: MoodDataPoint[]
}): React.ReactElement {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <GrowthProgressBars scores={scores} />
        <HealthChart data={moodHistory} />
      </div>
      {scores.length > 0 && (
        <div className="rounded-lg border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">Overall Growth Score</p>
          <p className="mt-1 text-4xl font-bold text-foreground">
            {Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length)}%
          </p>
        </div>
      )}
    </div>
  )
}
