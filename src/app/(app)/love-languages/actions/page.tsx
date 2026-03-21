'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useLoveLanguages } from '@/contexts/LoveLanguagesContext'
import { LoveActionCard } from '@/components/love-languages/LoveActionCard'
import { AddActionDialog } from '@/components/love-languages/AddActionDialog'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ConfirmDeleteDialog } from '@/components/ui/ConfirmDeleteDialog'
import { Plus, Calendar, CheckCircle2, Sparkles, Info } from 'lucide-react'
import type { LoveAction, LoveActionStatus, LoveActionFrequency, LoveActionDifficulty } from '@/types'

function DeleteActionDialog({
  deleteTarget,
  onClose,
  onDelete,
}: {
  deleteTarget: string | null
  onClose: () => void
  onDelete: (id: string) => Promise<void>
}): React.ReactNode {
  function handleConfirm(): void {
    if (deleteTarget) {
      void onDelete(deleteTarget)
      onClose()
    }
  }

  return (
    <ConfirmDeleteDialog
      open={deleteTarget !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title="Delete Love Action"
      description="Are you sure you want to delete this love action? This action cannot be undone."
      onConfirm={handleConfirm}
    />
  )
}

function LoveActionsContent(): React.ReactNode {
  const searchParams = useSearchParams()
  const rawLanguageId = searchParams.get('languageId')
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const preselectedLanguageId = rawLanguageId && UUID_RE.test(rawLanguageId) ? rawLanguageId : null

  const { languages, partnerLanguages, actions, addAction, updateAction, deleteAction, completeAction } =
    useLoveLanguages()

  const [showAddDialog, setShowAddDialog] = useState(!!preselectedLanguageId)
  const [editingAction, setEditingAction] = useState<LoveAction | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const allLanguages = [...languages, ...partnerLanguages]
  const pendingActions = actions.filter((a) => a.status === 'planned' || a.status === 'suggested')
  const recurringActions = actions.filter((a) => a.status === 'recurring')
  const completedActions = actions.filter((a) => a.status === 'completed')

  function getLinkedTitle(action: LoveAction): string | undefined {
    if (!action.linkedLanguageId) return undefined
    return allLanguages.find((l) => l.id === action.linkedLanguageId)?.title
  }

  function handleEdit(action: LoveAction): void {
    setEditingAction(action)
    setShowAddDialog(true)
  }

  function handleDialogClose(open: boolean): void {
    setShowAddDialog(open)
    if (!open) setEditingAction(null)
  }

  function handleSubmit(data: {
    title: string
    description: string | null
    linkedLanguageId: string | null
    status: LoveActionStatus
    frequency: LoveActionFrequency
    difficulty: LoveActionDifficulty
  }): void {
    if (editingAction) {
      void updateAction(editingAction.id, data)
      setEditingAction(null)
    } else {
      void addAction(data)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Love Actions" description="Turn love languages into meaningful actions" />

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="mb-6">
          <Alert className="border-rose-200 bg-rose-50/50">
            <Info className="h-4 w-4 text-rose-600" />
            <AlertDescription className="text-gray-700 font-medium">
              Love Actions are specific ways to show love based on your partner&apos;s love languages. Start small and
              build consistency over time.
            </AlertDescription>
          </Alert>
        </div>

        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-700 font-medium">
              <span className="font-semibold text-gray-900">{actions.length}</span> total actions
            </div>
            <div className="text-sm text-gray-700 font-medium">
              <span className="font-semibold text-gray-900">{completedActions.length}</span> completed
            </div>
          </div>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Action
          </Button>
        </div>

        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 bg-white">
            <TabsTrigger value="pending" className="text-gray-700 data-[state=active]:text-gray-900">
              <Calendar className="h-4 w-4 mr-2" />
              Pending ({pendingActions.length})
            </TabsTrigger>
            <TabsTrigger value="recurring" className="text-gray-700 data-[state=active]:text-gray-900">
              <Sparkles className="h-4 w-4 mr-2" />
              Recurring ({recurringActions.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="text-gray-700 data-[state=active]:text-gray-900">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Completed ({completedActions.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            <ActionList
              actions={pendingActions}
              getLinkedTitle={getLinkedTitle}
              onComplete={completeAction}
              onEdit={handleEdit}
              onDelete={setDeleteTarget}
              emptyTitle="No Pending Actions"
              emptyDesc="Add actions to show love in ways that matter to your partner."
              onAdd={() => setShowAddDialog(true)}
            />
          </TabsContent>

          <TabsContent value="recurring" className="space-y-4">
            <ActionList
              actions={recurringActions}
              getLinkedTitle={getLinkedTitle}
              onComplete={completeAction}
              onEdit={handleEdit}
              onDelete={setDeleteTarget}
              emptyTitle="No Recurring Actions"
              emptyDesc="Set up recurring actions for consistent expressions of love."
            />
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            <ActionList
              actions={completedActions}
              getLinkedTitle={getLinkedTitle}
              onEdit={handleEdit}
              onDelete={setDeleteTarget}
              emptyTitle="No Completed Actions Yet"
              emptyDesc="Complete your first action to start building your history."
            />
          </TabsContent>
        </Tabs>
      </main>

      <AddActionDialog
        open={showAddDialog}
        onOpenChange={handleDialogClose}
        onSubmit={handleSubmit}
        languages={languages}
        partnerLanguages={partnerLanguages}
        editingAction={editingAction}
        preselectedLanguageId={preselectedLanguageId}
      />

      <DeleteActionDialog deleteTarget={deleteTarget} onClose={() => setDeleteTarget(null)} onDelete={deleteAction} />
    </div>
  )
}

interface ActionListProps {
  actions: LoveAction[]
  getLinkedTitle: (action: LoveAction) => string | undefined
  onComplete?: (id: string) => Promise<void>
  onEdit: (action: LoveAction) => void
  onDelete: (id: string) => void
  emptyTitle: string
  emptyDesc: string
  onAdd?: () => void
}

function ActionList({
  actions,
  getLinkedTitle,
  onComplete,
  onEdit,
  onDelete,
  emptyTitle,
  emptyDesc,
  onAdd,
}: ActionListProps): React.ReactNode {
  if (actions.length === 0) {
    return (
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-gray-900">{emptyTitle}</CardTitle>
          <CardDescription className="text-gray-700">{emptyDesc}</CardDescription>
        </CardHeader>
        {onAdd && (
          <CardContent>
            <Button onClick={onAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Action
            </Button>
          </CardContent>
        )}
      </Card>
    )
  }

  return (
    <div className="grid gap-4">
      {actions.map((action) => (
        <LoveActionCard
          key={action.id}
          action={action}
          linkedLanguageTitle={getLinkedTitle(action)}
          onComplete={onComplete ? () => void onComplete(action.id) : undefined}
          onEdit={() => onEdit(action)}
          onDelete={() => onDelete(action.id)}
        />
      ))}
    </div>
  )
}

export default function LoveActionsPage(): React.ReactNode {
  return (
    <Suspense>
      <LoveActionsContent />
    </Suspense>
  )
}
