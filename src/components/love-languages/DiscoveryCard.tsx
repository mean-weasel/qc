'use client'

import { useState } from 'react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useLoveLanguages } from '@/contexts/LoveLanguagesContext'
import type { LoveLanguageDiscovery } from '@/types'

import { ConvertDiscoveryDialog } from './ConvertDiscoveryDialog'

interface Props {
  discovery: LoveLanguageDiscovery
  onDelete: (id: string) => Promise<void>
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString()
}

export function DiscoveryCard({ discovery, onDelete }: Props): React.ReactElement {
  const { convertToLanguage } = useLoveLanguages()
  const [showConvertDialog, setShowConvertDialog] = useState(false)

  const isConverted = !!discovery.convertedToLanguageId

  async function handleConvert(data: {
    title: string
    description: string
    category: string
    importance: string
  }): Promise<void> {
    if (!data.title.trim()) {
      toast.error('Title is required')
      return
    }

    try {
      await convertToLanguage(discovery.id, {
        title: data.title.trim(),
        description: data.description.trim() || null,
        category: data.category as never,
        privacy: 'private',
        importance: data.importance as never,
        examples: [],
        tags: [],
      })
      toast.success('Discovery converted to love language')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to convert discovery')
    }
  }

  return (
    <>
      <Card>
        <CardContent className="flex items-start justify-between gap-4 p-4">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium">💡 Discovery</h3>
              {isConverted && (
                <Badge variant="outline" className="text-xs">
                  🔗 Converted to Language
                </Badge>
              )}
            </div>

            <p className="text-sm text-muted-foreground">{discovery.discovery}</p>

            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span>Discovered {formatDate(discovery.createdAt)}</span>
            </div>
          </div>

          <div className="flex shrink-0 gap-1">
            {!isConverted && (
              <>
                <Button variant="outline" size="sm" className="min-h-[44px]" onClick={() => setShowConvertDialog(true)}>
                  Convert to Language
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="min-h-[44px] text-destructive"
                  onClick={() => onDelete(discovery.id)}
                >
                  Delete
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <ConvertDiscoveryDialog
        open={showConvertDialog}
        onOpenChange={setShowConvertDialog}
        discoveryText={discovery.discovery}
        onConvert={handleConvert}
      />
    </>
  )
}
