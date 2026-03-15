'use client'

import { useState, useEffect } from 'react'
import {
  MessageCircle,
  Clock,
  Users,
  ArrowRight,
  Play,
  Settings,
  Sparkles,
  FileText,
  AlertCircle,
  X,
} from 'lucide-react'
import { MotionBox, StaggerContainer, StaggerItem } from '@/components/ui/motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { useSessionSettings } from '@/contexts/SessionSettingsContext'
import { SessionRulesCard } from '@/components/checkin/SessionRulesCard'
import { useBookends } from '@/contexts/BookendsContext'
import { PreparationModal } from '@/components/bookends/PreparationModal'
import { useCheckInContext } from '@/contexts/CheckInContext'
import { ProgressBar } from '@/components/checkin/ProgressBar'
import { useCategories } from '@/hooks/useCategories'
import {
  CategorySelectionStep,
  CategoryDiscussionStep,
  ReflectionStep,
  ActionItemsStep,
  CompletionStep,
  WarmUpStep,
} from './steps'
import type { SessionSettings } from '@/types'
import { RecentCheckInsSection } from './RecentCheckInsSection'

interface SessionRulesSectionProps {
  settings: SessionSettings
}

function SessionRulesSection({ settings }: SessionRulesSectionProps): React.ReactNode {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-900">Your Session Rules</h2>
        <Link href="/settings">
          <Button variant="ghost" size="default" className="text-xs sm:text-sm">
            <Settings className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
            <span className="hidden sm:inline">Configure</span>
            <span className="sm:hidden">Edit</span>
          </Button>
        </Link>
      </div>
      <SessionRulesCard settings={settings} compact />
    </div>
  )
}

interface QuickStartSectionProps {
  topicCount: number
  onPrepare: () => void
  onStart: () => void
}

function QuickStartSection({ topicCount, onPrepare, onStart }: QuickStartSectionProps): React.ReactNode {
  return (
    <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg border border-pink-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Quick Check-In (5 minutes)</h2>
          <p className="text-gray-600 mt-1">Start with our guided quick check-in</p>
          {topicCount > 0 ? (
            <Badge className="mt-2 bg-pink-100 text-pink-700 border-pink-300">
              <Sparkles className="h-3 w-3 mr-1" />
              {topicCount} topics prepared
            </Badge>
          ) : null}
        </div>
        <div className="flex gap-2 flex-wrap">
          {topicCount === 0 && (
            <Button variant="outline" onClick={onPrepare} className="text-sm sm:text-base">
              <FileText className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden xs:inline">Prepare </span>Topics
            </Button>
          )}
          <Button className="bg-pink-600 hover:bg-pink-700 text-sm sm:text-base" onClick={onStart}>
            <Play className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden xs:inline">Start </span>Now
          </Button>
        </div>
      </div>
      <div className="flex items-center mt-4 text-sm text-gray-500">
        <Clock className="h-4 w-4 mr-1" />
        <span>Typically takes 5-10 minutes</span>
        <Users className="h-4 w-4 ml-4 mr-1" />
        <span>Best done together</span>
      </div>
    </div>
  )
}

function CheckInErrorBanner(): React.ReactNode {
  const { error, clearError } = useCheckInContext()
  if (!error) return null

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
      <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm text-red-800">{error}</p>
      </div>
      <button onClick={clearError} className="text-red-400 hover:text-red-600">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

function CheckInLanding(): React.ReactNode {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const { getActiveSettings } = useSessionSettings()
  const sessionSettings = getActiveSettings()
  const { preparation, openPreparationModal } = useBookends()
  const { startCheckIn, coupleId } = useCheckInContext()
  const { categories, isLoading } = useCategories(coupleId)

  const topicCount = preparation?.myTopics?.length ?? 0

  const handleStartQuickCheckIn = (): void => {
    const categoryList = topicCount > 0 ? preparation!.myTopics.map((t) => t.content) : categories.map((c) => c.name)
    startCheckIn(categoryList)
  }

  const handleStartCategoryCheckIn = (): void => {
    if (selectedCategory) {
      const categoryName = categories.find((c) => c.id === selectedCategory)?.name ?? selectedCategory
      startCheckIn([categoryName])
    }
  }

  return (
    <MotionBox variant="page" className="space-y-8">
      <CheckInErrorBanner />
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-pink-100 rounded-full p-3">
            <MessageCircle className="h-8 w-8 text-pink-600" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">Relationship Check-In</h1>
        <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
          Take a few minutes to reflect on your relationship and share your thoughts together.
        </p>
      </div>

      {sessionSettings && <SessionRulesSection settings={sessionSettings} />}

      <QuickStartSection topicCount={topicCount} onPrepare={openPreparationModal} onStart={handleStartQuickCheckIn} />

      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Or choose a specific topic to explore:</h2>
        {isLoading ? (
          <div className="text-center text-gray-500 py-8">Loading categories...</div>
        ) : (
          <StaggerContainer className="grid gap-4 sm:grid-cols-2">
            {categories.map((category) => (
              <StaggerItem key={category.id}>
                <div
                  className={`bg-white rounded-lg border-2 p-6 cursor-pointer transition-all ${
                    selectedCategory === category.id
                      ? 'border-pink-500 bg-pink-50'
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  }`}
                  onClick={() => setSelectedCategory(selectedCategory === category.id ? null : category.id)}
                >
                  <div className="flex items-start space-x-3">
                    <div className="text-2xl">{category.icon}</div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900">{category.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                    </div>
                    <ArrowRight
                      className={`h-5 w-5 transition-colors ${
                        selectedCategory === category.id ? 'text-pink-500' : 'text-gray-400'
                      }`}
                    />
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        )}

        {selectedCategory && (
          <MotionBox variant="fade" className="mt-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Ready to explore {categories.find((c) => c.id === selectedCategory)?.name}?
                  </h3>
                  <p className="text-gray-600 mt-1">
                    We&apos;ll guide you through thoughtful questions and provide space for both of you to share.
                  </p>
                </div>
                <Button onClick={handleStartCategoryCheckIn}>
                  Start Discussion
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          </MotionBox>
        )}
      </div>

      <RecentCheckInsSection coupleId={coupleId} />

      <PreparationModal />
    </MotionBox>
  )
}

function CheckInWizard(): React.ReactNode {
  const { session } = useCheckInContext()
  const { getActiveSettings } = useSessionSettings()
  const sessionSettings = getActiveSettings()

  if (!session) return null

  const currentStep = session.progress.currentStep

  const stepComponent = (() => {
    switch (currentStep) {
      case 'welcome':
      case 'category-selection':
        return <CategorySelectionStep />
      case 'warm-up': {
        if (!sessionSettings?.warmUpQuestions) {
          return <CategoryDiscussionStep />
        }
        return <WarmUpStep />
      }
      case 'category-discussion':
        return <CategoryDiscussionStep />
      case 'reflection':
        return <ReflectionStep />
      case 'action-items':
        return <ActionItemsStep />
      case 'completion':
        return <CompletionStep />
      default:
        return <CategorySelectionStep />
    }
  })()

  return (
    <div className="space-y-6">
      <CheckInErrorBanner />
      {currentStep !== 'completion' && (
        <ProgressBar progress={session.progress} currentStep={currentStep} className="mb-8" />
      )}
      {stepComponent}
    </div>
  )
}

export default function CheckInPage(): React.ReactNode {
  const { session } = useCheckInContext()

  useEffect(() => {
    if (!session) return

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }

    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [session])

  if (session) {
    return <CheckInWizard />
  }

  return <CheckInLanding />
}
