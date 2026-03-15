'use client'

import { Heart } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { QuizStep } from '@/components/onboarding/QuizStep'
import type { Preferences } from '@/components/onboarding/QuizStep'
import { ReminderStep } from '@/components/onboarding/ReminderStep'
import { TourStep } from '@/components/onboarding/TourStep'

import { completeOnboarding } from './actions'
import type { OnboardingState } from './actions'
import { StepDisplayName, StepLoveLanguages, StepPartnerEmail, StepRelationshipDate } from './onboarding-steps'

const TOTAL_STEPS = 7

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-2 flex-1 rounded-full transition-colors ${i < current ? 'gradient-primary' : 'bg-muted'}`}
        />
      ))}
    </div>
  )
}

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [displayName, setDisplayName] = useState('')
  const [partnerEmail, setPartnerEmail] = useState('')
  const [relationshipStartDate, setRelationshipStartDate] = useState('')
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([])
  const [preferences, setPreferences] = useState<Preferences>({
    communicationStyle: '',
    checkInFrequency: '',
    sessionStyle: '',
  })
  const [reminderDay, setReminderDay] = useState('sunday')
  const [reminderTime, setReminderTime] = useState('20:00')
  const formRef = useRef<HTMLFormElement>(null)
  const router = useRouter()

  const [state, formAction, isPending] = useActionState<OnboardingState, FormData>(completeOnboarding, {
    error: null,
  })

  useEffect(() => {
    if (state.success) {
      if (!state.emailSent) {
        toast.warning('Your account is set up, but the invite email couldn\'t be sent. You can resend it from Settings.')
      }
      router.push('/dashboard')
    }
  }, [state, router])

  function handleSubmit() {
    formRef.current?.requestSubmit()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-rose-50 to-orange-50 p-4 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-md space-y-6 rounded-2xl bg-card p-8 shadow-lg">
        <div className="space-y-2 text-center">
          <Heart className="mx-auto h-10 w-10 text-pink-500 transition-transform hover:scale-110" />
          <h1 className="text-gradient-primary text-2xl font-bold">Welcome to QC</h1>
          <p className="text-sm text-muted-foreground">Set up your couple profile in a few quick steps</p>
          <p className="text-xs text-muted-foreground">Takes about 2 minutes</p>
        </div>

        <StepIndicator current={step} total={TOTAL_STEPS} />

        {state.error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {state.error}
          </div>
        )}

        <form ref={formRef} action={formAction}>
          <input type="hidden" name="displayName" value={displayName} />
          <input type="hidden" name="partnerEmail" value={partnerEmail} />
          <input type="hidden" name="relationshipStartDate" value={relationshipStartDate} />
          <input type="hidden" name="selectedLanguages" value={JSON.stringify(selectedLanguages)} />
          <input type="hidden" name="preferences" value={JSON.stringify(preferences)} />
          <input type="hidden" name="reminderDay" value={reminderDay} />
          <input type="hidden" name="reminderTime" value={reminderTime} />

          {step === 1 && (
            <StepDisplayName displayName={displayName} setDisplayName={setDisplayName} setStep={setStep} />
          )}
          {step === 2 && (
            <StepPartnerEmail partnerEmail={partnerEmail} setPartnerEmail={setPartnerEmail} setStep={setStep} />
          )}
          {step === 3 && (
            <StepRelationshipDate
              relationshipStartDate={relationshipStartDate}
              setRelationshipStartDate={setRelationshipStartDate}
              setStep={setStep}
            />
          )}
          {step === 4 && (
            <StepLoveLanguages
              selectedLanguages={selectedLanguages}
              setSelectedLanguages={setSelectedLanguages}
              setStep={setStep}
            />
          )}
          {step === 5 && (
            <QuizStep
              preferences={preferences}
              updatePreferences={(prefs) => setPreferences((prev) => ({ ...prev, ...prefs }))}
              onNext={() => setStep(6)}
              onBack={() => setStep(4)}
            />
          )}
          {step === 6 && (
            <ReminderStep
              reminderDay={reminderDay}
              reminderTime={reminderTime}
              onUpdate={(day, time) => {
                setReminderDay(day)
                setReminderTime(time)
              }}
              onNext={() => setStep(7)}
              onBack={() => setStep(5)}
            />
          )}
          {step === 7 && <TourStep isPending={isPending} onBack={() => setStep(6)} onComplete={handleSubmit} />}
        </form>
      </div>
    </div>
  )
}
