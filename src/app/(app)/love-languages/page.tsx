'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLoveLanguages } from '@/contexts/LoveLanguagesContext'
import { LoveLanguageCard } from '@/components/love-languages/LoveLanguageCard'
import { AddLanguageDialog } from '@/components/love-languages/AddLanguageDialog'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { DiscoveryCard } from '@/components/love-languages/DiscoveryCard'
import { ConfirmDeleteDialog } from '@/components/ui/ConfirmDeleteDialog' // eslint-disable-line
import { Plus, Heart, Sparkles, Info, Lightbulb } from 'lucide-react'
import type { LoveLanguage, LoveLanguageDiscovery } from '@/types'

interface LanguageGroupProps {
  title: string
  languages: LoveLanguage[]
  badgeVariant: 'secondary' | 'outline'
  onEdit: (language: LoveLanguage) => void
  onDelete: (id: string) => void
  onTogglePrivacy: (id: string) => void
}

function LanguageGroup({
  title,
  languages,
  badgeVariant,
  onEdit,
  onDelete,
  onTogglePrivacy,
}: LanguageGroupProps): React.ReactNode {
  if (languages.length === 0) return null

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
        {title}
        <Badge variant={badgeVariant} className="text-gray-700">
          {languages.length}
        </Badge>
      </h3>
      <div className="grid gap-4">
        {languages.map((language) => (
          <LoveLanguageCard
            key={language.id}
            language={language}
            onEdit={() => onEdit(language)}
            onDelete={() => onDelete(language.id)}
            onTogglePrivacy={() => onTogglePrivacy(language.id)}
          />
        ))}
      </div>
    </div>
  )
}

interface DiscoveriesTabProps {
  discoveries: LoveLanguageDiscovery[]
  onDelete: (id: string) => Promise<void>
}

function DiscoveriesTab({ discoveries, onDelete }: DiscoveriesTabProps): React.ReactNode {
  if (discoveries.length === 0) {
    return (
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-gray-900">No Discoveries Yet</CardTitle>
          <CardDescription className="text-gray-700">
            Discoveries are insights about love languages that emerge during check-in sessions. They can be converted
            into full love language entries.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="grid gap-4">
      {discoveries.map((discovery) => (
        <DiscoveryCard key={discovery.id} discovery={discovery} onDelete={onDelete} />
      ))}
    </div>
  )
}

interface PartnerLanguagesTabProps {
  partnerLanguages: LoveLanguage[]
}

function PartnerLanguagesTab({ partnerLanguages }: PartnerLanguagesTabProps): React.ReactNode {
  const router = useRouter()

  if (partnerLanguages.length === 0) {
    return (
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-gray-900">No Shared Languages Yet</CardTitle>
          <CardDescription className="text-gray-700">
            Your partner hasn&apos;t shared any love languages yet. Encourage them to add and share theirs!
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="grid gap-4">
      {partnerLanguages.map((language) => (
        <LoveLanguageCard
          key={language.id}
          language={language}
          isOwn={false}
          onCreateAction={() => {
            router.push(`/love-languages/actions?languageId=${language.id}`)
          }}
        />
      ))}
    </div>
  )
}

function DeleteLanguageDialog(props: {
  deleteTarget: string | null
  onClose: () => void
  onDelete: (id: string) => Promise<void>
}): React.ReactNode {
  return (
    <ConfirmDeleteDialog
      open={props.deleteTarget !== null}
      onOpenChange={(open) => {
        if (!open) props.onClose()
      }}
      title="Delete Love Language"
      description="Are you sure you want to delete this love language? This action cannot be undone."
      onConfirm={() => {
        if (props.deleteTarget) {
          void props.onDelete(props.deleteTarget)
          props.onClose()
        }
      }}
    />
  )
}

export default function LoveLanguagesPage(): React.ReactNode {
  const {
    languages,
    partnerLanguages,
    discoveries,
    addLanguage,
    updateLanguage,
    deleteLanguage,
    deleteDiscovery,
    toggleLanguagePrivacy,
  } = useLoveLanguages()

  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingLanguage, setEditingLanguage] = useState<LoveLanguage | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  function handleEdit(language: LoveLanguage): void {
    setEditingLanguage(language)
    setShowAddDialog(true)
  }

  function handleSubmit(data: {
    title: string
    description: string | null
    category: LoveLanguage['category']
    privacy: LoveLanguage['privacy']
    importance: LoveLanguage['importance']
    examples: string[]
    tags: string[]
  }): void {
    if (editingLanguage) {
      void updateLanguage(editingLanguage.id, data)
      setEditingLanguage(null)
    } else {
      void addLanguage(data)
    }
  }

  function handleDialogClose(open: boolean): void {
    setShowAddDialog(open)
    if (!open) setEditingLanguage(null)
  }

  function handleTogglePrivacy(id: string): void {
    void toggleLanguagePrivacy(id)
  }

  const sharedLanguages = languages.filter((l) => l.privacy === 'shared')
  const privateLanguages = languages.filter((l) => l.privacy === 'private')

  const addLanguageButton = (
    <Button onClick={() => setShowAddDialog(true)}>
      <Plus className="h-4 w-4 mr-2" />
      Add Language
    </Button>
  )

  return (
    <PageContainer
      title="Love Languages"
      description="Discover and share the unique ways you feel loved"
      action={addLanguageButton}
    >
      <Alert className="border-rose-200 bg-rose-50/50">
        <Info className="h-4 w-4 text-rose-600" />
        <AlertDescription className="text-gray-700 font-medium">
          Love Languages help your partner understand what makes you feel most loved and appreciated. Start with a few
          and refine them over time as you discover more about yourself.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="mine" className="space-y-4">
        <TabsList className="bg-white">
          <TabsTrigger value="mine" className="text-gray-700 data-[state=active]:text-gray-900">
            <Heart className="h-4 w-4 mr-2" />
            My Languages ({languages.length})
          </TabsTrigger>
          <TabsTrigger value="partner" className="text-gray-700 data-[state=active]:text-gray-900">
            <Sparkles className="h-4 w-4 mr-2" />
            Partner&apos;s ({partnerLanguages.length})
          </TabsTrigger>
          <TabsTrigger value="discoveries" className="text-gray-700 data-[state=active]:text-gray-900">
            <Lightbulb className="h-4 w-4 mr-2" />
            Discoveries ({discoveries.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mine" className="space-y-6">
          {languages.length === 0 ? (
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="text-gray-900">No Love Languages Yet</CardTitle>
                <CardDescription className="text-gray-700">
                  Start by adding your first love language. Think about specific moments when you felt most loved.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Love Language
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <LanguageGroup
                title="Shared with Partner"
                languages={sharedLanguages}
                badgeVariant="secondary"
                onEdit={handleEdit}
                onDelete={setDeleteTarget}
                onTogglePrivacy={handleTogglePrivacy}
              />
              <LanguageGroup
                title="Private"
                languages={privateLanguages}
                badgeVariant="outline"
                onEdit={handleEdit}
                onDelete={setDeleteTarget}
                onTogglePrivacy={handleTogglePrivacy}
              />
            </>
          )}
        </TabsContent>

        <TabsContent value="partner" className="space-y-4">
          <PartnerLanguagesTab partnerLanguages={partnerLanguages} />
        </TabsContent>

        <TabsContent value="discoveries" className="space-y-4">
          <DiscoveriesTab discoveries={discoveries} onDelete={deleteDiscovery} />
        </TabsContent>
      </Tabs>

      <AddLanguageDialog
        open={showAddDialog}
        onOpenChange={handleDialogClose}
        onSubmit={handleSubmit}
        initialLanguage={editingLanguage ?? undefined}
      />

      <DeleteLanguageDialog
        deleteTarget={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDelete={deleteLanguage}
      />
    </PageContainer>
  )
}
