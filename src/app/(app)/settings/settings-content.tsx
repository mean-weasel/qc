'use client'

import { useState } from 'react'

import { PageContainer } from '@/components/layout/PageContainer'
import { CategoryManager } from '@/components/settings/CategoryManager'
import { PromptManager } from '@/components/settings/PromptManager'
import { DataExportPanel } from '@/components/settings/DataExportPanel'
import { DeleteAccountPanel } from '@/components/settings/DeleteAccountPanel'
import { NotificationSettings } from '@/components/settings/NotificationSettings'
import { PersonalizationPanel } from '@/components/settings/PersonalizationPanel'
import { PrivacySettings } from '@/components/settings/PrivacySettings'
import { ProfileSettings } from '@/components/settings/ProfileSettings'
import { RelationshipSettings } from '@/components/settings/RelationshipSettings'
import { ReminderScheduler } from '@/components/settings/ReminderScheduler'
import { SessionSettingsPanel } from '@/components/settings/SessionSettingsPanel'
import { ThemeSelector } from '@/components/settings/ThemeSelector'
import type { DbCouple, DbProfile, DbReminder, DbSessionSettings } from '@/types/database'

type SettingsTab =
  | 'profile'
  | 'relationship'
  | 'session'
  | 'categories'
  | 'reminders'
  | 'notifications'
  | 'appearance'
  | 'data'

interface Props {
  profile: DbProfile | null
  couple: DbCouple | null
  sessionSettings: DbSessionSettings | null
  partner: { id: string; display_name: string | null; email: string } | null
  pendingInvite: { id: string; invited_email: string; status: string } | null
  userEmail: string
  reminders: DbReminder[]
}

const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'relationship', label: 'Relationship' },
  { id: 'session', label: 'Session Rules' },
  { id: 'categories', label: 'Categories' },
  { id: 'reminders', label: 'Reminders' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'data', label: 'Data & Privacy' },
]

export function SettingsContent({
  profile,
  couple,
  sessionSettings,
  partner,
  pendingInvite,
  userEmail,
  reminders,
}: Props): React.ReactElement {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')

  const coupleSettings = (couple?.settings ?? {}) as Record<string, unknown>

  return (
    <PageContainer title="Settings" description="Customize your Quality Control experience">
      <div className="flex gap-2 overflow-x-auto scrollbar-hidden min-w-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-medium min-h-[44px] ${
              activeTab === tab.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'profile' && <ProfileSettings profile={profile} userEmail={userEmail} />}

      {activeTab === 'relationship' && (
        <RelationshipSettings couple={couple} partner={partner} pendingInvite={pendingInvite} />
      )}

      {activeTab === 'session' && (
        <SessionSettingsPanel sessionSettings={sessionSettings} coupleId={couple?.id ?? null} />
      )}

      {activeTab === 'categories' && couple?.id && (
        <div className="space-y-8">
          <CategoryManager coupleId={couple.id} />
          <PromptManager coupleId={couple.id} />
        </div>
      )}

      {activeTab === 'reminders' && couple?.id && <ReminderScheduler reminders={reminders} coupleId={couple.id} />}

      {activeTab === 'notifications' && couple?.id && (
        <div className="space-y-6">
          <NotificationSettings coupleId={couple.id} />
          <PrivacySettings coupleId={couple.id} />
        </div>
      )}

      {activeTab === 'appearance' && (
        <div className="space-y-8">
          <ThemeSelector />
          {couple?.id && (
            <PersonalizationPanel
              coupleId={couple.id}
              currentSettings={{
                primaryColor: coupleSettings.primaryColor as string | undefined,
                fontSize: coupleSettings.fontSize as string | undefined,
                highContrast: coupleSettings.highContrast as boolean | undefined,
                reducedMotion: coupleSettings.reducedMotion as boolean | undefined,
              }}
            />
          )}
        </div>
      )}

      {activeTab === 'data' && (
        <div className="space-y-6">
          <DataExportPanel />
          <DeleteAccountPanel />
        </div>
      )}
    </PageContainer>
  )
}
