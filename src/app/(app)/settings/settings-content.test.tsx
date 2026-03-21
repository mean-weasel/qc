import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('@/components/layout/PageContainer', () => ({
  PageContainer: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}))
vi.mock('@/components/settings/CategoryManager', () => ({
  CategoryManager: () => <div data-testid="category-manager" />,
}))
vi.mock('@/components/settings/PromptManager', () => ({
  PromptManager: () => <div data-testid="prompt-manager" />,
}))
vi.mock('@/components/settings/DataExportPanel', () => ({
  DataExportPanel: () => <div data-testid="data-export" />,
}))
vi.mock('@/components/settings/DeleteAccountPanel', () => ({
  DeleteAccountPanel: () => <div data-testid="delete-account" />,
}))
vi.mock('@/components/settings/NotificationSettings', () => ({
  NotificationSettings: () => <div data-testid="notifications" />,
}))
vi.mock('@/components/settings/PersonalizationPanel', () => ({
  PersonalizationPanel: () => <div data-testid="personalization" />,
}))
vi.mock('@/components/settings/PrivacySettings', () => ({
  PrivacySettings: () => <div data-testid="privacy" />,
}))
vi.mock('@/components/settings/ProfileSettings', () => ({
  ProfileSettings: () => <div data-testid="profile-settings" />,
}))
vi.mock('@/components/settings/RelationshipSettings', () => ({
  RelationshipSettings: () => <div data-testid="relationship-settings" />,
}))
vi.mock('@/components/settings/ReminderScheduler', () => ({
  ReminderScheduler: () => <div data-testid="reminder-scheduler" />,
}))
vi.mock('@/components/settings/SessionSettingsPanel', () => ({
  SessionSettingsPanel: () => <div data-testid="session-settings" />,
}))
vi.mock('@/components/settings/ThemeSelector', () => ({
  ThemeSelector: () => <div data-testid="theme-selector" />,
}))

const { SettingsContent } = await import('./settings-content')

function defaultProps() {
  return {
    profile: null,
    couple: null,
    sessionSettings: null,
    partner: null,
    pendingInvite: null,
    userEmail: 'test@example.com',
    reminders: [],
  }
}

const coupleProps = {
  couple: {
    id: 'c1',
    name: 'Test Couple',
    relationship_start_date: null,
    settings: {},
    created_at: '2025-01-01',
  },
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('SettingsContent', () => {
  it('renders Settings title', () => {
    render(<SettingsContent {...defaultProps()} />)
    expect(screen.getByText('Settings')).toBeDefined()
  })

  it('renders all 8 tab labels', () => {
    render(<SettingsContent {...defaultProps()} />)
    expect(screen.getByText('Profile')).toBeDefined()
    expect(screen.getByText('Relationship')).toBeDefined()
    expect(screen.getByText('Session Rules')).toBeDefined()
    expect(screen.getByText('Categories')).toBeDefined()
    expect(screen.getByText('Reminders')).toBeDefined()
    expect(screen.getByText('Notifications')).toBeDefined()
    expect(screen.getByText('Appearance')).toBeDefined()
    expect(screen.getByText('Data & Privacy')).toBeDefined()
  })

  it('shows ProfileSettings by default', () => {
    render(<SettingsContent {...defaultProps()} />)
    expect(screen.getByTestId('profile-settings')).toBeDefined()
  })

  it('clicking Relationship tab shows RelationshipSettings', () => {
    render(<SettingsContent {...defaultProps()} />)
    fireEvent.click(screen.getByText('Relationship'))
    expect(screen.getByTestId('relationship-settings')).toBeDefined()
  })

  it('clicking Session Rules tab shows SessionSettingsPanel', () => {
    render(<SettingsContent {...defaultProps()} />)
    fireEvent.click(screen.getByText('Session Rules'))
    expect(screen.getByTestId('session-settings')).toBeDefined()
  })

  it('clicking Data & Privacy tab shows DataExportPanel', () => {
    render(<SettingsContent {...defaultProps()} />)
    fireEvent.click(screen.getByText('Data & Privacy'))
    expect(screen.getByTestId('data-export')).toBeDefined()
  })

  it('CategoryManager not shown when couple is null', () => {
    render(<SettingsContent {...defaultProps()} />)
    fireEvent.click(screen.getByText('Categories'))
    expect(screen.queryByTestId('category-manager')).toBeNull()
  })

  it('clicking Appearance tab shows ThemeSelector', () => {
    render(<SettingsContent {...defaultProps()} />)
    fireEvent.click(screen.getByText('Appearance'))
    expect(screen.getByTestId('theme-selector')).toBeDefined()
  })

  it('clicking Categories when couple exists shows CategoryManager', () => {
    render(<SettingsContent {...defaultProps()} {...coupleProps} />)
    fireEvent.click(screen.getByText('Categories'))
    expect(screen.getByTestId('category-manager')).toBeDefined()
  })

  it('clicking Reminders when couple exists shows ReminderScheduler', () => {
    render(<SettingsContent {...defaultProps()} {...coupleProps} />)
    fireEvent.click(screen.getByText('Reminders'))
    expect(screen.getByTestId('reminder-scheduler')).toBeDefined()
  })

  it('clicking Appearance when couple exists shows PersonalizationPanel', () => {
    render(<SettingsContent {...defaultProps()} {...coupleProps} />)
    fireEvent.click(screen.getByText('Appearance'))
    expect(screen.getByTestId('personalization')).toBeDefined()
  })
})
