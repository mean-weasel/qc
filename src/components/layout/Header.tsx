'use client'

import { Heart, Moon, Sun } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { cn } from '@/lib/utils'

interface HeaderProps {
  className?: string
  displayName?: string | null
  partnerName?: string | null
  avatarUrl?: string | null
}

export function Header({ className = '', displayName, partnerName, avatarUrl }: HeaderProps): React.ReactNode {
  const { isDark, toggle } = useTheme()

  const initials = displayName ? displayName.charAt(0).toUpperCase() : '?'

  const partnerInitials = partnerName ? partnerName.charAt(0).toUpperCase() : null

  return (
    <header
      className={cn(
        'bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50',
        className,
      )}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* App Branding */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Heart className="w-6 h-6 text-pink-500 fill-current" />
              <span className="text-xl font-semibold text-gray-900 dark:text-white">QC</span>
            </div>
            <span className="hidden sm:block text-sm text-gray-500 dark:text-gray-400">Quality Control</span>
          </div>

          {/* Right side: theme toggle + avatars */}
          <div className="flex items-center gap-4">
            {/* Theme toggle */}
            <button
              onClick={toggle}
              className={cn(
                'p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors',
                isDark ? 'text-yellow-400 bg-yellow-500/10 hover:bg-yellow-500/20' : 'text-gray-500 hover:bg-gray-100',
              )}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* User Avatar Pair */}
            <div className="flex items-center gap-2">
              <div className="flex items-center -space-x-2">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName ?? 'User'}
                    className="w-8 h-8 rounded-full ring-2 ring-white dark:ring-gray-900 object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white text-sm font-medium ring-2 ring-white dark:ring-gray-900">
                    {initials}
                  </div>
                )}
                {partnerInitials && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-medium ring-2 ring-white dark:ring-gray-900">
                    {partnerInitials}
                  </div>
                )}
              </div>
              {displayName && (
                <div className="hidden sm:block ml-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{displayName}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
