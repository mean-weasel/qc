'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { Shuffle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCheckInContext } from '@/contexts/CheckInContext'
import { NoteTabs } from './NoteTabs'
import { BasicTextInput } from './BasicTextInput'

interface DiscussionViewProps {
  categoryId: string
  categoryName: string
  categoryDescription?: string
  categoryIcon?: string
  prompts: string[]
  onComplete: () => void
}

function useCategoryDrafts(categoryId: string) {
  const { session } = useCheckInContext()
  return useMemo(() => {
    const result = {
      privateText: '',
      sharedText: '',
      privateNoteId: null as string | null,
      sharedNoteId: null as string | null,
    }
    if (!session) return result
    for (const note of session.draftNotes) {
      if (note.categoryId !== categoryId) continue
      if (note.privacy === 'private' || note.privacy === 'draft') {
        result.privateText = note.content
        result.privateNoteId = note.id
      } else if (note.privacy === 'shared') {
        result.sharedText = note.content
        result.sharedNoteId = note.id
      }
    }
    return result
  }, [session, categoryId])
}

export function DiscussionView({
  categoryId,
  categoryName,
  categoryDescription,
  categoryIcon,
  prompts,
  onComplete,
}: DiscussionViewProps): React.ReactElement {
  const { session, addDraftNote, updateDraftNote, updateCategoryProgress } = useCheckInContext()
  const drafts = useCategoryDrafts(categoryId)
  const startTimeRef = useRef(0)

  useEffect(() => {
    startTimeRef.current = Date.now()
  }, [])

  const [activeTab, setActiveTab] = useState<'private' | 'shared'>('shared')
  const [privateText, setPrivateText] = useState(drafts.privateText)
  const [sharedText, setSharedText] = useState(drafts.sharedText)
  const [promptIndex, setPromptIndex] = useState(0)
  const [isSaving, setIsSaving] = useState(false)

  const privateNoteIdRef = useRef(drafts.privateNoteId)
  const sharedNoteIdRef = useRef(drafts.sharedNoteId)

  const saveNote = useCallback(
    async (privacy: 'private' | 'shared', content: string) => {
      if (!content.trim()) return
      const noteIdRef = privacy === 'private' ? privateNoteIdRef : sharedNoteIdRef
      if (noteIdRef.current) {
        await updateDraftNote(noteIdRef.current, { content })
      } else {
        await addDraftNote({
          coupleId: session?.baseCheckIn.coupleId ?? '',
          authorId: '',
          checkInId: session?.id ?? null,
          content,
          privacy: privacy === 'private' ? 'draft' : 'shared',
          tags: [],
          categoryId,
        })
      }
    },
    [session, categoryId, addDraftNote, updateDraftNote],
  )

  const handleSaveProgress = useCallback(async () => {
    setIsSaving(true)
    await Promise.all([saveNote('private', privateText), saveNote('shared', sharedText)])
    setIsSaving(false)
  }, [saveNote, privateText, sharedText])

  const handleComplete = useCallback(async () => {
    await handleSaveProgress()
    const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000)
    updateCategoryProgress(categoryId, { isCompleted: true, timeSpent })
    onComplete()
  }, [handleSaveProgress, categoryId, updateCategoryProgress, onComplete])

  const shufflePrompt = useCallback(() => {
    if (prompts.length <= 1) return
    setPromptIndex((prev) => (prev + 1) % prompts.length)
  }, [prompts.length])

  const currentPrompt = prompts.length > 0 ? prompts[promptIndex % prompts.length] : null

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="text-4xl">{categoryIcon ?? '💬'}</div>
        <h2 className="text-2xl font-bold text-foreground">{categoryName}</h2>
        {categoryDescription && <p className="text-muted-foreground">{categoryDescription}</p>}
      </div>

      {currentPrompt && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-foreground italic flex-1">&ldquo;{currentPrompt}&rdquo;</p>
            {prompts.length > 1 && (
              <button
                onClick={shufflePrompt}
                className="shrink-0 rounded-md p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Next prompt"
              >
                <Shuffle className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}

      <NoteTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        hasPrivateContent={privateText.length > 0}
        hasSharedContent={sharedText.length > 0}
      />

      {activeTab === 'private' ? (
        <BasicTextInput
          value={privateText}
          onChange={setPrivateText}
          placeholder="Write your private thoughts here..."
          helperText="Only you can see these notes"
          onSave={() => saveNote('private', privateText)}
          autoSave
        />
      ) : (
        <BasicTextInput
          value={sharedText}
          onChange={setSharedText}
          placeholder="Share your thoughts with your partner..."
          helperText="Your partner can see these notes"
          onSave={() => saveNote('shared', sharedText)}
          autoSave
        />
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={handleSaveProgress} disabled={isSaving} className="flex-1">
          {isSaving ? 'Saving...' : 'Save Progress'}
        </Button>
        <Button onClick={handleComplete} className="flex-1">
          <CheckCircle2 className="h-4 w-4 mr-2" />
          Complete Discussion
        </Button>
      </div>
    </div>
  )
}
