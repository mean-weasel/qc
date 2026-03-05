'use client'

import { Lock, Globe } from 'lucide-react'

interface NoteTabsProps {
  activeTab: 'private' | 'shared'
  onTabChange: (tab: 'private' | 'shared') => void
  hasPrivateContent: boolean
  hasSharedContent: boolean
}

const TABS = [
  { id: 'private' as const, label: 'Private Notes', Icon: Lock },
  { id: 'shared' as const, label: 'Shared Notes', Icon: Globe },
]

export function NoteTabs({
  activeTab,
  onTabChange,
  hasPrivateContent,
  hasSharedContent,
}: NoteTabsProps): React.ReactElement {
  const hasDot = { private: hasPrivateContent, shared: hasSharedContent }

  return (
    <div className="flex gap-1 rounded-lg bg-muted p-1" role="tablist">
      {TABS.map(({ id, label, Icon }) => (
        <button
          key={id}
          role="tab"
          aria-selected={activeTab === id}
          onClick={() => onTabChange(id)}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 min-h-[44px] text-sm font-medium transition-colors ${
            activeTab === id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
          {hasDot[id] && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
        </button>
      ))}
    </div>
  )
}
