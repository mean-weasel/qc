'use client'

import { useState } from 'react'
import type { LoveLanguage, LoveAction, LoveActionStatus, LoveActionFrequency, LoveActionDifficulty } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface ActionFormData {
  title: string
  description: string | null
  linkedLanguageId: string | null
  status: LoveActionStatus
  frequency: LoveActionFrequency
  difficulty: LoveActionDifficulty
}

interface AddActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: ActionFormData) => void
  languages: LoveLanguage[]
  partnerLanguages: LoveLanguage[]
  editingAction?: LoveAction | null
  preselectedLanguageId?: string | null
}

function deriveFormKey(editingAction: LoveAction | null | undefined, open: boolean): string {
  if (editingAction) return `edit-${editingAction.id}`
  return `new-${String(open)}`
}

interface ActionFormFieldsProps {
  languages: LoveLanguage[]
  partnerLanguages: LoveLanguage[]
  initialTitle: string
  initialDescription: string
  initialLinkedLanguageId: string
  initialStatus: LoveActionStatus
  initialFrequency: LoveActionFrequency
  initialDifficulty: LoveActionDifficulty
  isEditing: boolean
  onSubmit: (data: ActionFormData) => void
  onCancel: () => void
}

function ActionFormFields({
  languages,
  partnerLanguages,
  initialTitle,
  initialDescription,
  initialLinkedLanguageId,
  initialStatus,
  initialFrequency,
  initialDifficulty,
  isEditing,
  onSubmit,
  onCancel,
}: ActionFormFieldsProps): React.ReactNode {
  const [title, setTitle] = useState(initialTitle)
  const [description, setDescription] = useState(initialDescription)
  const [linkedLanguageId, setLinkedLanguageId] = useState(initialLinkedLanguageId)
  const [status, setStatus] = useState<LoveActionStatus>(initialStatus)
  const [frequency, setFrequency] = useState<LoveActionFrequency>(initialFrequency)
  const [difficulty, setDifficulty] = useState<LoveActionDifficulty>(initialDifficulty)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      await onSubmit({
        title,
        description: description || null,
        linkedLanguageId: linkedLanguageId || null,
        status,
        frequency,
        difficulty,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{isEditing ? 'Edit' : 'Add'} Love Action</DialogTitle>
        <DialogDescription>Create a specific action to express love</DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="la-title">Action Title *</Label>
          <Input
            id="la-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Leave a loving note in their lunch"
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="la-desc">Description</Label>
          <Textarea
            id="la-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what you'll do..."
            rows={3}
          />
        </div>
        <div className="grid gap-2">
          <Label>Love Language</Label>
          <Select value={linkedLanguageId} onValueChange={setLinkedLanguageId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a love language" />
            </SelectTrigger>
            <SelectContent>
              {languages.map((lang) => (
                <SelectItem key={lang.id} value={lang.id}>
                  {lang.title}
                </SelectItem>
              ))}
              {partnerLanguages.map((lang) => (
                <SelectItem key={lang.id} value={lang.id}>
                  {lang.title} (partner)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="grid gap-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as LoveActionStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="suggested">Suggested</SelectItem>
                <SelectItem value="planned">Planned</SelectItem>
                <SelectItem value="recurring">Recurring</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Frequency</Label>
            <Select value={frequency} onValueChange={(v) => setFrequency(v as LoveActionFrequency)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="once">Once</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="surprise">Surprise</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Difficulty</Label>
            <Select value={difficulty} onValueChange={(v) => setDifficulty(v as LoveActionDifficulty)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="challenging">Challenging</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!title || isSubmitting}>
          {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Action'}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function AddActionDialog({
  open,
  onOpenChange,
  onSubmit,
  languages,
  partnerLanguages,
  editingAction,
  preselectedLanguageId,
}: AddActionDialogProps): React.ReactNode {
  function handleFormSubmit(data: ActionFormData): void {
    onSubmit(data)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <ActionFormFields
          key={deriveFormKey(editingAction, open)}
          languages={languages}
          partnerLanguages={partnerLanguages}
          initialTitle={editingAction?.title ?? ''}
          initialDescription={editingAction?.description ?? ''}
          initialLinkedLanguageId={editingAction?.linkedLanguageId ?? preselectedLanguageId ?? ''}
          initialStatus={editingAction?.status ?? 'planned'}
          initialFrequency={editingAction?.frequency ?? 'once'}
          initialDifficulty={editingAction?.difficulty ?? 'easy'}
          isEditing={!!editingAction}
          onSubmit={handleFormSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
