'use client'

import { useState, useCallback } from 'react'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import { Reorder } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { useCategories } from '@/hooks/useCategories'
import { updateCategoryPrompts } from '@/app/(app)/settings/actions/prompts'

interface PromptManagerProps {
  coupleId: string
}

export function PromptManager({ coupleId }: PromptManagerProps): React.ReactElement {
  const { categories } = useCategories(coupleId)
  const firstCategory = categories[0] ?? null
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [prompts, setPrompts] = useState<string[]>([])
  const [newPrompt, setNewPrompt] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Sync first category when categories load (derived state)
  const resolvedCategoryId = selectedCategoryId || firstCategory?.id || ''
  if (resolvedCategoryId && resolvedCategoryId !== selectedCategoryId && categories.length > 0) {
    setSelectedCategoryId(resolvedCategoryId)
    const cat = categories.find((c) => c.id === resolvedCategoryId)
    setPrompts(cat?.prompts ?? [])
  }

  const handleCategoryChange = useCallback(
    (categoryId: string) => {
      setSelectedCategoryId(categoryId)
      const cat = categories.find((c) => c.id === categoryId)
      setPrompts(cat?.prompts ?? [])
      setError(null)
      setSuccess(false)
    },
    [categories],
  )

  const handleAddPrompt = useCallback(() => {
    const trimmed = newPrompt.trim()
    if (!trimmed || prompts.length >= 10) return
    setPrompts((prev) => [...prev, trimmed])
    setNewPrompt('')
  }, [newPrompt, prompts.length])

  const handleRemovePrompt = useCallback((index: number) => {
    setPrompts((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    setError(null)
    setSuccess(false)
    const result = await updateCategoryPrompts(selectedCategoryId, prompts)
    setIsSaving(false)
    if (result.error) {
      setError(result.error)
    } else {
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    }
  }, [selectedCategoryId, prompts])

  if (categories.length === 0) {
    return <p className="text-sm text-muted-foreground">No categories available.</p>
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Discussion Prompts</h3>
        <p className="text-sm text-muted-foreground">Add prompts that appear during check-in discussions.</p>
      </div>

      {/* Category selector */}
      <div className="flex gap-2 overflow-x-auto">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleCategoryChange(cat.id)}
            className={`whitespace-nowrap rounded-full px-3 py-2.5 text-sm font-medium min-h-[44px] transition-colors ${
              selectedCategoryId === cat.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {cat.icon} {cat.name}
          </button>
        ))}
      </div>

      {/* Prompt list */}
      <Reorder.Group axis="y" values={prompts} onReorder={setPrompts} className="space-y-2">
        {prompts.map((prompt, index) => (
          <Reorder.Item key={prompt} value={prompt} className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 cursor-grab" />
            <div className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm">{prompt}</div>
            <button
              onClick={() => handleRemovePrompt(index)}
              className="shrink-0 rounded-md p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
              aria-label={`Remove prompt: ${prompt}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </Reorder.Item>
        ))}
      </Reorder.Group>

      {prompts.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">No prompts yet. Add one below to get started.</p>
      )}

      {/* Add prompt */}
      {prompts.length < 10 && (
        <div className="flex gap-2">
          <input
            type="text"
            value={newPrompt}
            onChange={(e) => setNewPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleAddPrompt()
              }
            }}
            placeholder="Type a new prompt..."
            maxLength={200}
            className="flex-1 rounded-md border border-input bg-background px-3 py-2.5 text-base min-h-[44px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button variant="outline" size="default" onClick={handleAddPrompt} disabled={!newPrompt.trim()}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
      )}

      {prompts.length >= 10 && <p className="text-xs text-muted-foreground">Maximum 10 prompts per category.</p>}

      {/* Save + status */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Prompts'}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {success && <p className="text-sm text-green-600 dark:text-green-400">Prompts saved!</p>}
      </div>
    </div>
  )
}
