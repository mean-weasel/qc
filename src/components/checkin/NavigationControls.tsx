'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Check, AlertCircle, Loader2, ArrowRight, ArrowLeft } from 'lucide-react'
import type { CheckInStep } from '@/types/checkin'

interface NavigationControlsProps {
  currentStep: CheckInStep
  canGoBack?: boolean
  canGoNext?: boolean
  onBack?: () => void
  onNext?: () => void
  onCancel?: () => void
  isLoading?: boolean
  nextLabel?: string
  backLabel?: string
  className?: string
  variant?: 'default' | 'floating' | 'mobile'
  showProgress?: boolean
  currentStepIndex?: number
  totalSteps?: number
}

export function NavigationControls({
  canGoBack = true,
  canGoNext = true,
  onBack,
  onNext,
  onCancel,
  isLoading = false,
  nextLabel = 'Next',
  backLabel = 'Back',
  className,
  variant = 'default',
  showProgress = false,
  currentStepIndex,
  totalSteps,
}: NavigationControlsProps): React.ReactNode {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  if (variant === 'floating') {
    return (
      <>
        <motion.div
          className={cn(
            'fixed bottom-0 left-0 right-0 z-[60]',
            'bg-white/95 backdrop-blur-sm border-t border-gray-200',
            'px-4 py-3 safe-area-bottom',
            className,
          )}
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
            <Button variant="ghost" size="lg" onClick={onBack} disabled={!canGoBack || isLoading}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">{backLabel}</span>
            </Button>
            {showProgress && currentStepIndex !== undefined && totalSteps && (
              <span className="text-sm text-gray-600">
                Step {currentStepIndex + 1} of {totalSteps}
              </span>
            )}
            <Button
              size="lg"
              onClick={onNext}
              disabled={!canGoNext || isLoading}
              className="bg-gradient-to-r from-pink-500 to-purple-600 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {nextLabel}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </motion.div>
        <CancelConfirmDialog
          isOpen={showCancelConfirm}
          onClose={() => setShowCancelConfirm(false)}
          onConfirm={() => {
            setShowCancelConfirm(false)
            onCancel?.()
          }}
        />
      </>
    )
  }

  if (variant === 'mobile') {
    return (
      <div className={cn('space-y-3', className)}>
        <Button
          size="lg"
          onClick={onNext}
          disabled={!canGoNext || isLoading}
          className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              {nextLabel}
              {nextLabel !== 'Complete' && <ArrowRight className="h-4 w-4 ml-2" />}
            </>
          )}
        </Button>
        <Button variant="outline" size="lg" onClick={onBack} disabled={!canGoBack || isLoading} className="w-full">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {backLabel}
        </Button>
      </div>
    )
  }

  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      <Button variant="outline" onClick={onBack} disabled={!canGoBack || isLoading}>
        <ChevronLeft className="h-4 w-4 mr-1" />
        {backLabel}
      </Button>
      {showProgress && currentStepIndex !== undefined && totalSteps && (
        <span className="text-sm text-gray-600 font-medium">
          Step {currentStepIndex + 1} of {totalSteps}
        </span>
      )}
      <Button onClick={onNext} disabled={!canGoNext || isLoading} className="min-w-[100px]">
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            Processing
          </>
        ) : (
          <>
            {nextLabel}
            {nextLabel === 'Complete' ? <Check className="h-4 w-4 ml-1" /> : <ChevronRight className="h-4 w-4 ml-1" />}
          </>
        )}
      </Button>
    </div>
  )
}

function CancelConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}): React.ReactNode {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed z-50 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
              <div className="flex items-start space-x-3">
                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Cancel Check-in?</h3>
                  <p className="mt-2 text-sm text-gray-600">
                    Are you sure you want to cancel? Your progress will be saved.
                  </p>
                </div>
              </div>
              <div className="mt-6 flex gap-3 justify-end">
                <Button variant="outline" onClick={onClose}>
                  Keep Going
                </Button>
                <Button variant="ghost" onClick={onConfirm} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                  Yes, Cancel
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
