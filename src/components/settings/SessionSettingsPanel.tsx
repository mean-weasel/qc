'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { updateSessionSettings } from '@/app/(app)/settings/actions'
import type { SettingsActionState } from '@/app/(app)/settings/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SessionProposalBanner } from '@/components/settings/SessionProposalBanner'
import { Switch } from '@/components/ui/switch'
import { hapticFeedback } from '@/lib/haptics'
import type { DbSessionSettings } from '@/types/database'

interface Props {
  sessionSettings: DbSessionSettings | null
  coupleId: string | null
}

const DEFAULTS: Omit<DbSessionSettings, 'id' | 'couple_id'> = {
  session_duration: 15,
  timeouts_per_partner: 1,
  timeout_duration: 2,
  turn_based_mode: false,
  turn_duration: 120,
  allow_extensions: true,
  warm_up_questions: true,
  cool_down_time: 3,
  pause_notifications: false,
  auto_save_drafts: true,
  version: 1,
  agreed_by: [],
}

export function SessionSettingsPanel({ sessionSettings, coupleId }: Props): React.ReactElement {
  if (!coupleId) {
    return (
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Session Rules</h2>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Join a couple first to configure session settings.</p>
        </CardContent>
      </Card>
    )
  }

  const settings = sessionSettings ?? DEFAULTS

  return (
    <>
      <SessionProposalBanner />
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Session Rules</h2>
          <p className="text-sm text-muted-foreground">Configure how check-in sessions work for your couple</p>
        </CardHeader>
        <CardContent>
          <SessionSettingsForm settings={settings} />
        </CardContent>
      </Card>
    </>
  )
}

interface FormProps {
  settings: Omit<DbSessionSettings, 'id' | 'couple_id'>
}

function SessionSettingsForm({ settings }: FormProps): React.ReactElement {
  const [formState, formAction, isPending] = useActionState<SettingsActionState, FormData>(updateSessionSettings, {})
  const prevFormState = useRef(formState)

  useEffect(() => {
    if (formState === prevFormState.current) return
    prevFormState.current = formState
    if (formState.error) {
      toast.error(formState.error)
    } else if (formState.success) {
      toast.success('Session settings saved')
      hapticFeedback.success()
    }
  }, [formState])

  return (
    <form action={formAction} className="space-y-6">
      <TimingSection settings={settings} />
      <DiscussionSection settings={settings} />

      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Features</h3>
        <div className="space-y-3">
          <ToggleField
            name="allow_extensions"
            label="Allow Extensions"
            description="Let partners extend session time"
            defaultChecked={settings.allow_extensions}
          />
          <ToggleField
            name="warm_up_questions"
            label="Warm-Up Questions"
            description="Start sessions with icebreaker prompts"
            defaultChecked={settings.warm_up_questions}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Behavior</h3>
        <div className="space-y-3">
          <ToggleField
            name="pause_notifications"
            label="Pause Notifications"
            description="Silence notifications during active check-in sessions"
            defaultChecked={settings.pause_notifications}
          />
          <ToggleField
            name="auto_save_drafts"
            label="Auto-Save Drafts"
            description="Automatically save notes and reflections as you type"
            defaultChecked={settings.auto_save_drafts}
          />
        </div>
      </div>

      {formState.error && <p className="text-sm text-destructive">{formState.error}</p>}
      {formState.success && <p className="text-sm text-green-600">Session settings updated</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Saving...' : 'Save Session Rules'}
      </Button>
    </form>
  )
}

function TimingSection({ settings }: { settings: Omit<DbSessionSettings, 'id' | 'couple_id'> }): React.ReactElement {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Timing</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="session_duration">Session Duration (min)</Label>
          <Input
            id="session_duration"
            name="session_duration"
            type="number"
            min={5}
            max={60}
            defaultValue={settings.session_duration}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="timeouts_per_partner">Timeouts Per Partner</Label>
          <Input
            id="timeouts_per_partner"
            name="timeouts_per_partner"
            type="number"
            min={0}
            max={5}
            defaultValue={settings.timeouts_per_partner}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="timeout_duration">Timeout Duration (min)</Label>
          <Input
            id="timeout_duration"
            name="timeout_duration"
            type="number"
            min={1}
            max={10}
            defaultValue={settings.timeout_duration}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cool_down_time">Cool Down Time (min)</Label>
          <Input
            id="cool_down_time"
            name="cool_down_time"
            type="number"
            min={0}
            max={15}
            defaultValue={settings.cool_down_time}
          />
        </div>
      </div>
    </div>
  )
}

function DiscussionSection({
  settings,
}: {
  settings: Omit<DbSessionSettings, 'id' | 'couple_id'>
}): React.ReactElement {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Discussion</h3>
      <div className="space-y-3">
        <ToggleField
          name="turn_based_mode"
          label="Turn-Based Mode"
          description="Take turns speaking during check-ins"
          defaultChecked={settings.turn_based_mode}
        />
        {settings.turn_based_mode && (
          <div className="space-y-2 pl-4">
            <Label htmlFor="turn_duration">Turn Duration (seconds)</Label>
            <Input
              id="turn_duration"
              name="turn_duration"
              type="number"
              min={30}
              max={600}
              defaultValue={settings.turn_duration}
            />
          </div>
        )}
        <input type="hidden" name="turn_duration" value={settings.turn_duration} />
      </div>
    </div>
  )
}

interface ToggleFieldProps {
  name: string
  label: string
  description: string
  defaultChecked: boolean
}

function ToggleField({ name, label, description, defaultChecked }: ToggleFieldProps): React.ReactElement {
  const [checked, setChecked] = useState(defaultChecked)
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer">
      <input type="hidden" name={name} value={String(checked)} />
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={setChecked} />
    </label>
  )
}
