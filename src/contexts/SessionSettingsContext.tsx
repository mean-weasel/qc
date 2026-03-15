'use client'

/* eslint-disable max-lines */
/* eslint-disable max-lines-per-function */

import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react'
import type { SessionSettings, SessionTemplate, SessionSettingsProposal } from '@/types'
import type { DbSessionSettings, DbSessionSettingsProposal } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { useRealtimeCouple } from '@/hooks/useRealtimeCouple'

interface SessionSettingsTemplate {
  name: string
  type: SessionTemplate
  description: string
  settings: Partial<SessionSettings>
}

interface SessionSettingsContextType {
  currentSettings: SessionSettings | null
  templates: SessionSettingsTemplate[]
  pendingProposal: SessionSettingsProposal | null
  proposeSettings: (settings: Partial<SessionSettings>) => Promise<void>
  respondToProposal: (proposalId: string, accept: boolean) => Promise<void>
  applyTemplate: (templateType: SessionTemplate) => void
  getActiveSettings: () => SessionSettings
}

const DEFAULT_TEMPLATES: SessionSettingsTemplate[] = [
  {
    name: 'Quick Check-in',
    type: 'quick',
    description: '5-minute focused session without timeouts',
    settings: {
      sessionDuration: 5,
      timeoutsPerPartner: 0,
      timeoutDuration: 0,
      turnBasedMode: false,
      allowExtensions: false,
      warmUpQuestions: false,
      coolDownTime: 0,
    },
  },
  {
    name: 'Standard Session',
    type: 'standard',
    description: '10-minute balanced session with turn-based discussion',
    settings: {
      sessionDuration: 10,
      timeoutsPerPartner: 1,
      timeoutDuration: 2,
      turnBasedMode: true,
      turnDuration: 90,
      allowExtensions: true,
      warmUpQuestions: false,
      coolDownTime: 2,
    },
  },
  {
    name: 'Deep Dive',
    type: 'deep-dive',
    description: '20-minute comprehensive session with warm-up and reflection',
    settings: {
      sessionDuration: 20,
      timeoutsPerPartner: 2,
      timeoutDuration: 3,
      turnBasedMode: true,
      turnDuration: 120,
      allowExtensions: true,
      warmUpQuestions: true,
      coolDownTime: 5,
    },
  },
]

const DEFAULT_SETTINGS: SessionSettings = {
  id: 'default',
  coupleId: '',
  sessionDuration: 10,
  timeoutsPerPartner: 1,
  timeoutDuration: 2,
  turnBasedMode: true,
  turnDuration: 90,
  allowExtensions: true,
  warmUpQuestions: false,
  coolDownTime: 2,
  pauseNotifications: false,
  autoSaveDrafts: true,
  version: 1,
  agreedBy: [],
}

function mapDbToSettings(row: DbSessionSettings): SessionSettings {
  return {
    id: row.id,
    coupleId: row.couple_id,
    sessionDuration: row.session_duration,
    timeoutsPerPartner: row.timeouts_per_partner,
    timeoutDuration: row.timeout_duration,
    turnBasedMode: row.turn_based_mode,
    turnDuration: row.turn_duration,
    allowExtensions: row.allow_extensions,
    warmUpQuestions: row.warm_up_questions,
    coolDownTime: row.cool_down_time,
    pauseNotifications: row.pause_notifications,
    autoSaveDrafts: row.auto_save_drafts,
    version: row.version,
    agreedBy: row.agreed_by,
  }
}

function mapDbToProposal(row: DbSessionSettingsProposal): SessionSettingsProposal {
  return {
    id: row.id,
    coupleId: row.couple_id,
    proposedBy: row.proposed_by,
    proposedAt: row.proposed_at,
    settings: row.settings,
    status: row.status,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
  }
}

const SessionSettingsContext = createContext<SessionSettingsContextType | undefined>(undefined)

interface SessionSettingsProviderProps {
  children: React.ReactNode
  coupleId: string
}

export function SessionSettingsProvider({ children, coupleId }: SessionSettingsProviderProps): React.ReactNode {
  const [currentSettings, setCurrentSettings] = useState<SessionSettings | null>(null)
  const [pendingProposal, setPendingProposal] = useState<SessionSettingsProposal | null>(null)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    async function loadSettings() {
      const { data, error } = await supabase
        .from('session_settings')
        .select('*')
        .eq('couple_id', coupleId)
        .maybeSingle()

      if (error) {
        console.error('Failed to load session settings:', error)
        setCurrentSettings({ ...DEFAULT_SETTINGS, coupleId })
        return
      }

      if (data) {
        setCurrentSettings(mapDbToSettings(data))
      } else {
        setCurrentSettings({ ...DEFAULT_SETTINGS, coupleId })
      }
    }

    async function loadPendingProposal() {
      const { data, error } = await supabase
        .from('session_settings_proposals')
        .select('*')
        .eq('couple_id', coupleId)
        .eq('status', 'pending')
        .maybeSingle()

      if (error) {
        console.error('Failed to load pending proposal:', error)
        return
      }

      if (data) {
        setPendingProposal(mapDbToProposal(data))
      }
    }

    void Promise.all([loadSettings(), loadPendingProposal()])
  }, [coupleId, supabase])

  // Realtime subscription for proposals
  useRealtimeCouple<DbSessionSettingsProposal>({
    table: 'session_settings_proposals',
    coupleId,
    onInsert: useCallback((record: DbSessionSettingsProposal) => {
      const proposal = mapDbToProposal(record)
      if (proposal.status === 'pending') {
        setPendingProposal(proposal)
      }
    }, []),
    onUpdate: useCallback((record: DbSessionSettingsProposal) => {
      const proposal = mapDbToProposal(record)
      if (proposal.status !== 'pending') {
        setPendingProposal(null)
      }
    }, []),
    onDelete: useCallback(() => {
      setPendingProposal(null)
    }, []),
  })

  const proposeSettings = useCallback(
    async (settings: Partial<SessionSettings>) => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return

      // Check for existing pending proposal to avoid duplicates
      const { data: existing } = await supabase
        .from('session_settings_proposals')
        .select('id')
        .eq('couple_id', coupleId)
        .eq('status', 'pending')
        .maybeSingle()

      if (existing) {
        // Update existing proposal instead of creating a duplicate
        const { error } = await supabase
          .from('session_settings_proposals')
          .update({ settings: settings as Record<string, unknown> })
          .eq('id', existing.id)
        if (error) console.error('Failed to update proposal:', error)
      } else {
        const { error } = await supabase.from('session_settings_proposals').insert({
          couple_id: coupleId,
          proposed_by: userData.user.id,
          settings: settings as Record<string, unknown>,
          status: 'pending',
        })
        if (error) console.error('Failed to create proposal:', error)
      }
    },
    [coupleId, supabase],
  )

  const respondToProposal = useCallback(
    async (proposalId: string, accept: boolean) => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return

      const proposal = pendingProposal
      if (!proposal) return

      if (proposal.proposedBy === userData.user.id) {
        console.error('Cannot accept your own proposal')
        return
      }

      if (proposal.status !== 'pending') {
        console.error('Proposal has already been reviewed')
        return
      }

      if (accept) {
        const updatedSettings = { ...currentSettings, ...proposal.settings } as SessionSettings

        const currentVersion = currentSettings?.version || 1
        const agreedBy = currentSettings?.agreedBy || []

        await supabase.from('session_settings').upsert({
          id: currentSettings?.id === 'default' ? undefined : currentSettings?.id,
          couple_id: coupleId,
          session_duration: updatedSettings.sessionDuration,
          timeouts_per_partner: updatedSettings.timeoutsPerPartner,
          timeout_duration: updatedSettings.timeoutDuration,
          turn_based_mode: updatedSettings.turnBasedMode,
          turn_duration: updatedSettings.turnDuration,
          allow_extensions: updatedSettings.allowExtensions,
          warm_up_questions: updatedSettings.warmUpQuestions,
          cool_down_time: updatedSettings.coolDownTime,
          pause_notifications: updatedSettings.pauseNotifications,
          auto_save_drafts: updatedSettings.autoSaveDrafts,
          version: currentVersion + 1,
          agreed_by: [...agreedBy, proposal.proposedBy, userData.user.id],
        })

        setCurrentSettings(updatedSettings)
      }

      await supabase
        .from('session_settings_proposals')
        .update({
          status: accept ? 'accepted' : 'rejected',
          reviewed_by: userData.user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', proposalId)

      setPendingProposal(null)
    },
    [pendingProposal, currentSettings, coupleId, supabase],
  )

  const applyTemplate = useCallback(
    (templateType: SessionTemplate) => {
      const template = DEFAULT_TEMPLATES.find((t) => t.type === templateType)
      if (!template) return
      proposeSettings(template.settings)
    },
    [proposeSettings],
  )

  const getActiveSettings = useCallback((): SessionSettings => {
    return currentSettings || { ...DEFAULT_SETTINGS, coupleId }
  }, [currentSettings, coupleId])

  const value = useMemo(
    () => ({
      currentSettings,
      templates: DEFAULT_TEMPLATES,
      pendingProposal,
      proposeSettings,
      respondToProposal,
      applyTemplate,
      getActiveSettings,
    }),
    [currentSettings, pendingProposal, proposeSettings, respondToProposal, applyTemplate, getActiveSettings],
  )

  return <SessionSettingsContext.Provider value={value}>{children}</SessionSettingsContext.Provider>
}

export function useSessionSettings(): SessionSettingsContextType {
  const context = useContext(SessionSettingsContext)
  if (context === undefined) {
    throw new Error('useSessionSettings must be used within a SessionSettingsProvider')
  }
  return context
}
