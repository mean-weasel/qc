'use client'

import { useState, useCallback } from 'react'
import { Sparkles } from 'lucide-react'
import { MotionBox } from '@/components/ui/motion'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { useBookends } from '@/contexts/BookendsContext'
import { ReflectionForm } from '@/components/bookends/ReflectionForm'
import { useCheckInContext } from '@/contexts/CheckInContext'
import { useSessionSettings } from '@/contexts/SessionSettingsContext'
import { useCategories } from '@/hooks/useCategories'
import { CategoryGrid } from '@/components/checkin/CategoryGrid'
import { NavigationControls } from '@/components/checkin/NavigationControls'
import { DiscussionView } from '@/components/checkin/DiscussionView'
import { ActionItems } from '@/components/checkin/ActionItems'
import { CompletionCelebration } from '@/components/checkin/CompletionCelebration'
import { SessionTimer } from '@/components/checkin/SessionTimer'
import { TurnIndicator } from '@/components/checkin/TurnIndicator'

export { WarmUpStep } from '@/components/checkin/WarmUpStep'

export function CategorySelectionStep(): React.ReactNode {
  const { session, completeStep, updateCategoryProgress, abandonCheckIn, coupleId } = useCheckInContext()
  const { categories } = useCategories(coupleId)
  const [selectedCategories, setSelectedCategories] = useState<string[]>(session?.selectedCategories ?? [])

  const handleCategorySelect = useCallback((categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId],
    )
  }, [])

  const handleStartDiscussion = useCallback(
    (selected: string[]) => {
      for (const categoryId of selected) {
        updateCategoryProgress(categoryId, { isCompleted: false })
      }
      completeStep('category-selection')
    },
    [completeStep, updateCategoryProgress],
  )

  const handleBack = useCallback(() => {
    abandonCheckIn()
  }, [abandonCheckIn])

  const categoryGridData = categories.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description || '',
    icon: c.icon,
    order: c.sortOrder,
  }))

  return (
    <MotionBox variant="page" className="space-y-6">
      <CategoryGrid
        categories={categoryGridData}
        categoryProgress={session?.categoryProgress}
        selectedCategories={selectedCategories}
        onCategorySelect={handleCategorySelect}
        onStartCheckIn={handleStartDiscussion}
        multiSelect
        showProgress
      />
      <NavigationControls
        currentStep="category-selection"
        canGoBack
        canGoNext={false}
        onBack={handleBack}
        onCancel={abandonCheckIn}
        backLabel="Cancel"
      />
    </MotionBox>
  )
}

export function CategoryDiscussionStep(): React.ReactNode {
  const { session, completeStep, goToStep, getCurrentCategoryProgress, coupleId } = useCheckInContext()
  const { getActiveSettings } = useSessionSettings()
  const settings = getActiveSettings()
  const { categories } = useCategories(coupleId)
  const currentCategory = getCurrentCategoryProgress()
  const category = categories.find((c) => c.id === currentCategory?.categoryId)

  return (
    <MotionBox variant="page" className="max-w-3xl mx-auto px-4 py-6 pb-28 space-y-6">
      <div className="flex items-center justify-center">
        <SessionTimer durationMinutes={settings.sessionDuration} sessionStartedAt={session?.startedAt} />
      </div>

      <TurnIndicator />

      <DiscussionView
        categoryId={category?.id ?? ''}
        categoryName={category?.name ?? 'Discussion'}
        categoryDescription={category?.description ?? undefined}
        categoryIcon={category?.icon}
        prompts={category?.prompts ?? []}
        onComplete={() => completeStep('category-discussion')}
      />

      <NavigationControls
        currentStep="category-discussion"
        canGoBack
        canGoNext
        onBack={() => goToStep('warm-up')}
        onNext={() => completeStep('category-discussion')}
        nextLabel="Continue to Reflection"
        variant="floating"
        showProgress
        currentStepIndex={3}
        totalSteps={7}
      />
    </MotionBox>
  )
}

export function ReflectionStep(): React.ReactNode {
  const { session, completeStep, goToStep } = useCheckInContext()
  const { openReflectionModal } = useBookends()

  return (
    <MotionBox variant="page" className="max-w-3xl mx-auto px-4 py-6 pb-28 space-y-6">
      <div className="text-center space-y-2">
        <div className="text-4xl">💭</div>
        <h2 className="text-2xl font-bold text-gray-900">Reflection</h2>
        <p className="text-gray-600">Take a moment to reflect on your check-in together.</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <Button onClick={openReflectionModal} className="w-full" variant="outline">
          <Sparkles className="h-4 w-4 mr-2" />
          Write a Reflection
        </Button>
      </div>

      <ReflectionForm sessionId={session?.id || 'none'} />

      <NavigationControls
        currentStep="reflection"
        canGoBack
        canGoNext
        onBack={() => goToStep('category-discussion')}
        onNext={() => completeStep('reflection')}
        nextLabel="Continue to Action Items"
        variant="floating"
        showProgress
        currentStepIndex={4}
        totalSteps={7}
      />
    </MotionBox>
  )
}

export function ActionItemsStep(): React.ReactNode {
  const { session, completeStep, goToStep, addActionItem, removeActionItem, toggleActionItem, actionItems } =
    useCheckInContext()

  return (
    <ActionItems
      actionItems={actionItems}
      onAddActionItem={addActionItem}
      onRemoveActionItem={removeActionItem}
      onToggleActionItem={toggleActionItem}
      coupleId={session?.baseCheckIn.coupleId ?? ''}
      onBack={() => goToStep('reflection')}
      onNext={() => completeStep('action-items')}
    />
  )
}

export function CompletionStep(): React.ReactNode {
  const router = useRouter()
  const { session, completeCheckIn, actionItems } = useCheckInContext()
  const [isCompleting, setIsCompleting] = useState(false)

  const [timeSpent] = useState(() =>
    session ? Math.round((Date.now() - new Date(session.startedAt).getTime()) / 60000) : 0,
  )

  const handleGoHome = useCallback(async () => {
    setIsCompleting(true)
    const success = await completeCheckIn()
    if (success) {
      router.push('/dashboard')
    }
    setIsCompleting(false)
  }, [completeCheckIn, router])

  const handleStartNew = useCallback(async () => {
    setIsCompleting(true)
    await completeCheckIn()
    setIsCompleting(false)
  }, [completeCheckIn])

  return (
    <CompletionCelebration
      show
      categories={session?.selectedCategories}
      timeSpent={timeSpent}
      actionItemsCount={actionItems.length}
      notesCount={session?.draftNotes.length ?? 0}
      moodBefore={session?.baseCheckIn.moodBefore}
      moodAfter={session?.baseCheckIn.moodAfter}
      onGoHome={handleGoHome}
      onStartNew={handleStartNew}
      isCompleting={isCompleting}
    />
  )
}
