'use client'

import type { LoveLanguage } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Heart, Lock, Unlock, Edit2, Trash2, Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoveLanguageCardProps {
  language: LoveLanguage
  isOwn?: boolean
  onEdit?: () => void
  onDelete?: () => void
  onTogglePrivacy?: () => void
  onCreateAction?: () => void
}

const CATEGORY_ICONS: Record<string, string> = {
  words: '\uD83D\uDCAC',
  acts: '\uD83E\uDD1D',
  gifts: '\uD83C\uDF81',
  time: '\u23F0',
  touch: '\uD83E\uDD17',
  custom: '\u2728',
}

const IMPORTANCE_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  essential: 'bg-red-100 text-red-700',
}

export function LoveLanguageCard({
  language,
  isOwn = true,
  onEdit,
  onDelete,
  onTogglePrivacy,
  onCreateAction,
}: LoveLanguageCardProps): React.ReactNode {
  return (
    <Card className="bg-white hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{CATEGORY_ICONS[language.category] ?? CATEGORY_ICONS.custom}</span>
              <CardTitle className="text-lg text-gray-900">{language.title}</CardTitle>
            </div>
            {language.description && (
              <CardDescription className="mt-1 text-gray-700">{language.description}</CardDescription>
            )}
          </div>
          {isOwn && onTogglePrivacy && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onTogglePrivacy}
              className="ml-2"
              title={language.privacy === 'private' ? 'Make visible to partner' : 'Make private'}
            >
              {language.privacy === 'private' ? (
                <Lock className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Unlock className="h-4 w-4 text-green-600" />
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {language.examples.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-900 mb-2">Examples:</p>
              <ul className="text-sm text-gray-700 space-y-1">
                {language.examples.map((example, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-gray-400 mt-0.5">&#8226;</span>
                    <span>{example}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={cn('capitalize', IMPORTANCE_COLORS[language.importance])}>
              {language.importance === 'essential' && <Star className="h-3 w-3 mr-1" />}
              {language.importance}
            </Badge>
            <Badge variant="outline" className="capitalize text-gray-700">
              {language.category}
            </Badge>
            {language.tags?.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs text-gray-700">
                {tag}
              </Badge>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-2">
            {!isOwn && onCreateAction && (
              <Button onClick={onCreateAction} size="sm" className="min-h-[44px] flex-1">
                <Heart className="h-4 w-4 mr-1" />
                Suggest Action
              </Button>
            )}
            {isOwn && (
              <>
                {onEdit && (
                  <Button onClick={onEdit} variant="outline" size="sm" className="min-h-[44px] flex-1">
                    <Edit2 className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                )}
                {onDelete && (
                  <Button onClick={onDelete} variant="outline" size="sm" className="min-h-[44px]">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
