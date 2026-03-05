'use client'

import { useState, useCallback } from 'react'
import { Shuffle, SkipForward, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { MotionBox } from '@/components/ui/motion'
import { Button } from '@/components/ui/button'
import { NavigationControls } from '@/components/checkin/NavigationControls'
import { useCheckInContext } from '@/contexts/CheckInContext'
import { pickThreePrompts } from '@/lib/warmup-prompts'
import { hapticFeedback } from '@/lib/haptics'
import type { WarmUpPrompt, PromptTone } from '@/lib/warmup-prompts'

const TONE_LABELS: Record<PromptTone, { label: string; color: string }> = {
  light: { label: 'Light', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  medium: { label: 'Medium', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  deep: { label: 'Deep', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
}

interface PromptCardProps {
  prompt: WarmUpPrompt
}

function PromptCard({ prompt }: PromptCardProps): React.ReactNode {
  const tone = TONE_LABELS[prompt.tone] ?? TONE_LABELS.light
  return (
    <motion.div
      className="rounded-lg border border-border bg-card p-5"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <span className={cn('inline-block rounded-full px-2 py-0.5 text-xs font-medium mb-2', tone.color)}>
        {tone.label}
      </span>
      <p className="text-lg font-medium text-foreground">{prompt.text}</p>
    </motion.div>
  )
}

export function WarmUpStep(): React.ReactNode {
  const { completeStep, goToStep } = useCheckInContext()
  const [prompts, setPrompts] = useState<WarmUpPrompt[]>(() => pickThreePrompts())

  const handleShuffle = useCallback(() => {
    hapticFeedback.tap()
    setPrompts(pickThreePrompts())
  }, [])

  const handleAdvance = useCallback(() => {
    completeStep('warm-up')
  }, [completeStep])

  return (
    <MotionBox variant="page" className="max-w-3xl mx-auto px-4 py-6 pb-28 space-y-6">
      <div className="text-center space-y-2">
        <div className="text-4xl">
          <Sparkles className="h-10 w-10 mx-auto text-amber-500" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Warm-Up Questions</h2>
        <p className="text-muted-foreground">Pick a question to get the conversation flowing, or skip ahead.</p>
      </div>

      <div className="space-y-3">
        {prompts.map((prompt) => (
          <PromptCard key={prompt.id} prompt={prompt} />
        ))}
      </div>

      <div className="flex justify-center gap-3">
        <Button variant="ghost" size="default" onClick={handleShuffle} className="gap-2 text-muted-foreground">
          <Shuffle className="h-4 w-4" />
          Shuffle
        </Button>
        <Button variant="ghost" size="default" onClick={handleAdvance} className="gap-1 text-muted-foreground">
          <SkipForward className="h-4 w-4" />
          Skip
        </Button>
      </div>

      <NavigationControls
        currentStep="warm-up"
        canGoBack
        canGoNext
        onBack={() => goToStep('category-selection')}
        onNext={handleAdvance}
        nextLabel="Continue"
        variant="floating"
        showProgress
        currentStepIndex={2}
        totalSteps={7}
      />
    </MotionBox>
  )
}
