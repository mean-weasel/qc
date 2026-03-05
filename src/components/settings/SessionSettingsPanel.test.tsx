import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

const mockFormAction = vi.fn()

vi.mock('react', async () => {
  const actual = await vi.importActual('react')
  return {
    ...actual,
    useActionState: vi.fn(() => [{}, mockFormAction, false]),
  }
})

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/app/(app)/settings/actions', () => ({
  updateSessionSettings: vi.fn(),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <button {...props}>{children}</button>
  ),
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  CardContent: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  CardHeader: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
}))

vi.mock('@/components/ui/input', () => ({
  Input: (props: Record<string, unknown>) => <input {...props} />,
}))

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <label {...props}>{children}</label>
  ),
}))

vi.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange, ...props }: { checked?: boolean; onCheckedChange?: (v: boolean) => void }) => (
    <button role="switch" aria-checked={checked} onClick={() => onCheckedChange?.(!checked)} {...props} />
  ),
}))

vi.mock('@/components/settings/SessionProposalBanner', () => ({
  SessionProposalBanner: () => <div data-testid="session-proposal-banner" />,
}))

vi.mock('@/lib/haptics', () => ({
  hapticFeedback: { success: vi.fn() },
}))

const { SessionSettingsPanel } = await import('./SessionSettingsPanel')

const defaultSettings = {
  id: 's1',
  couple_id: 'c1',
  session_duration: 15,
  timeouts_per_partner: 1,
  timeout_duration: 2,
  turn_based_mode: false,
  turn_duration: 120,
  allow_extensions: true,
  warm_up_questions: true,
  cool_down_time: 3,
  pause_notifications: false,
  auto_save_drafts: true,
  version: 1,
  agreed_by: [],
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('SessionSettingsPanel', () => {
  it('shows "Join a couple first" message when coupleId is null', () => {
    render(<SessionSettingsPanel sessionSettings={null} coupleId={null} />)
    expect(screen.getByText('Join a couple first to configure session settings.')).toBeDefined()
  })

  it('renders "Session Rules" heading when coupleId is provided', () => {
    render(<SessionSettingsPanel sessionSettings={defaultSettings} coupleId="c1" />)
    expect(screen.getByText('Session Rules')).toBeDefined()
  })

  it('renders "Configure how check-in sessions work" subtext', () => {
    render(<SessionSettingsPanel sessionSettings={defaultSettings} coupleId="c1" />)
    expect(screen.getByText('Configure how check-in sessions work for your couple')).toBeDefined()
  })

  it('renders SessionProposalBanner', () => {
    render(<SessionSettingsPanel sessionSettings={defaultSettings} coupleId="c1" />)
    expect(screen.getByTestId('session-proposal-banner')).toBeDefined()
  })

  it('renders "Session Duration (min)" label', () => {
    render(<SessionSettingsPanel sessionSettings={defaultSettings} coupleId="c1" />)
    expect(screen.getByText('Session Duration (min)')).toBeDefined()
  })

  it('renders "Timing" section heading', () => {
    render(<SessionSettingsPanel sessionSettings={defaultSettings} coupleId="c1" />)
    expect(screen.getByText('Timing')).toBeDefined()
  })

  it('renders "Features" section heading', () => {
    render(<SessionSettingsPanel sessionSettings={defaultSettings} coupleId="c1" />)
    expect(screen.getByText('Features')).toBeDefined()
  })

  it('renders "Save Session Rules" button', () => {
    render(<SessionSettingsPanel sessionSettings={defaultSettings} coupleId="c1" />)
    expect(screen.getByText('Save Session Rules')).toBeDefined()
  })
})
