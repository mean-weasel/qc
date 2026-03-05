'use client'

import { useState } from 'react'
import type { LoveLanguage, LoveLanguageCategory, LoveLanguageImportance, LoveLanguagePrivacy } from '@/types'
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Badge } from '@/components/ui/badge'
import { Plus, X } from 'lucide-react'

interface AddLanguageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (language: {
    title: string
    description: string | null
    category: LoveLanguageCategory
    privacy: LoveLanguagePrivacy
    importance: LoveLanguageImportance
    examples: string[]
    tags: string[]
  }) => void
  initialLanguage?: LoveLanguage
}

const IMPORTANCE_OPTIONS: { value: LoveLanguageImportance; label: string; hint: string; id: string }[] = [
  { value: 'low', label: 'Low', hint: 'Nice to have', id: 'll-low' },
  { value: 'medium', label: 'Medium', hint: 'Important to me', id: 'll-med' },
  { value: 'high', label: 'High', hint: 'Very important', id: 'll-hi' },
  { value: 'essential', label: 'Essential', hint: 'Critical for feeling loved', id: 'll-ess' },
]

const PRIVACY_OPTIONS: { value: LoveLanguagePrivacy; label: string; hint: string; id: string }[] = [
  { value: 'private', label: 'Private', hint: 'Only visible to me', id: 'll-priv' },
  { value: 'shared', label: 'Shared with partner', hint: 'Visible to your partner', id: 'll-shared' },
]

const CATEGORY_OPTIONS: { value: LoveLanguageCategory; label: string; emoji: string }[] = [
  { value: 'words', label: 'Words of Affirmation', emoji: '\uD83D\uDCAC' },
  { value: 'acts', label: 'Acts of Service', emoji: '\uD83E\uDD1D' },
  { value: 'gifts', label: 'Receiving Gifts', emoji: '\uD83C\uDF81' },
  { value: 'time', label: 'Quality Time', emoji: '\u23F0' },
  { value: 'touch', label: 'Physical Touch', emoji: '\uD83E\uDD17' },
  { value: 'custom', label: 'Custom', emoji: '\u2728' },
]

function ExamplesEditor({
  examples,
  onChange,
}: {
  examples: string[]
  onChange: (examples: string[]) => void
}): React.ReactNode {
  return (
    <div className="grid gap-2">
      <Label>Examples (optional)</Label>
      {examples.map((example, index) => (
        <div key={index} className="flex gap-2">
          <Input
            value={example}
            onChange={(e) => {
              const next = [...examples]
              // eslint-disable-next-line security/detect-object-injection -- index is a numeric iterator from .map()
              next[index] = e.target.value
              onChange(next)
            }}
            placeholder="Add a specific example..."
          />
          {examples.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onChange(examples.filter((_, i) => i !== index))}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...examples, ''])}
        className="min-h-[44px] w-fit"
      >
        <Plus className="h-4 w-4 mr-1" />
        Add Example
      </Button>
    </div>
  )
}

function TagsEditor({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }): React.ReactNode {
  const [tagInput, setTagInput] = useState('')

  function addTag(): void {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      onChange([...tags, tagInput.trim()])
      setTagInput('')
    }
  }

  return (
    <div className="grid gap-2">
      <Label>Tags (optional)</Label>
      <div className="flex gap-2">
        <Input
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          placeholder="Add a tag..."
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addTag()
            }
          }}
        />
        <Button type="button" variant="outline" onClick={addTag}>
          Add
        </Button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
              <button
                type="button"
                onClick={() => onChange(tags.filter((t) => t !== tag))}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

interface LanguageFormFieldsProps {
  initialLanguage?: LoveLanguage
  onSubmit: AddLanguageDialogProps['onSubmit']
  onCancel: () => void
}

function LanguageFormFields({ initialLanguage, onSubmit, onCancel }: LanguageFormFieldsProps): React.ReactNode {
  const [title, setTitle] = useState(initialLanguage?.title ?? '')
  const [description, setDescription] = useState(initialLanguage?.description ?? '')
  const [category, setCategory] = useState<LoveLanguageCategory>(initialLanguage?.category ?? 'custom')
  const [importance, setImportance] = useState<LoveLanguageImportance>(initialLanguage?.importance ?? 'medium')
  const [privacy, setPrivacy] = useState<LoveLanguagePrivacy>(initialLanguage?.privacy ?? 'private')
  const [examples, setExamples] = useState<string[]>(
    initialLanguage?.examples && initialLanguage.examples.length > 0 ? initialLanguage.examples : [''],
  )
  const [tags, setTags] = useState<string[]>(initialLanguage?.tags ?? [])

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault()
    onSubmit({
      title,
      description: description || null,
      category,
      importance,
      privacy,
      examples: examples.filter((ex) => ex.trim() !== ''),
      tags,
    })
    onCancel()
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{initialLanguage ? 'Edit' : 'Add'} Love Language</DialogTitle>
        <DialogDescription>Describe a specific way you feel loved and appreciated</DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="ll-title">Title *</Label>
          <Input
            id="ll-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Morning words of encouragement"
            required
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="ll-desc">Description</Label>
          <Textarea
            id="ll-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what this means to you..."
            rows={3}
          />
        </div>

        <div className="grid gap-2">
          <Label>Category</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as LoveLanguageCategory)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  <span className="flex items-center gap-2">
                    <span>{opt.emoji}</span>
                    <span>{opt.label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label>Importance</Label>
          <RadioGroup value={importance} onValueChange={(v) => setImportance(v as LoveLanguageImportance)}>
            {IMPORTANCE_OPTIONS.map((opt) => (
              <div key={opt.value} className="flex items-center space-x-2">
                <RadioGroupItem value={opt.value} id={opt.id} />
                <Label htmlFor={opt.id} className="flex flex-col">
                  <span>{opt.label}</span>
                  <span className="text-xs font-normal text-muted-foreground">{opt.hint}</span>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="grid gap-2">
          <Label>Privacy</Label>
          <RadioGroup value={privacy} onValueChange={(v) => setPrivacy(v as LoveLanguagePrivacy)}>
            {PRIVACY_OPTIONS.map((opt) => (
              <div key={opt.value} className="flex items-center space-x-2">
                <RadioGroupItem value={opt.value} id={opt.id} />
                <Label htmlFor={opt.id} className="flex flex-col">
                  <span>{opt.label}</span>
                  <span className="text-xs font-normal text-muted-foreground">{opt.hint}</span>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <ExamplesEditor examples={examples} onChange={setExamples} />
        <TagsEditor tags={tags} onChange={setTags} />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!title}>
          {initialLanguage ? 'Save Changes' : 'Add Love Language'}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function AddLanguageDialog({
  open,
  onOpenChange,
  onSubmit,
  initialLanguage,
}: AddLanguageDialogProps): React.ReactNode {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px] max-h-[90vh] overflow-y-auto">
        <LanguageFormFields
          key={initialLanguage?.id ?? 'new'}
          initialLanguage={initialLanguage}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
