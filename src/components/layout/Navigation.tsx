'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  MessageCircle,
  StickyNote,
  TrendingUp,
  Settings,
  Menu,
  X,
  Bell,
  Heart,
  HeartHandshake,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SignOutButton } from '@/components/sign-out-button'

const NAVIGATION_ITEMS = [
  { name: 'Dashboard', href: '/dashboard', icon: Home, mobileOrder: 1 },
  { name: 'Check-in', href: '/checkin', icon: MessageCircle, mobileOrder: 2 },
  { name: 'Notes', href: '/notes', icon: StickyNote, mobileOrder: 3 },
  { name: 'Growth', href: '/growth', icon: TrendingUp, mobileOrder: 4 },
  { name: 'Reminders', href: '/reminders', icon: Bell, mobileOrder: 5 },
  { name: 'Love Languages', href: '/love-languages', icon: Heart, mobileOrder: 6 },
  { name: 'Requests', href: '/requests', icon: HeartHandshake, mobileOrder: 7 },
  { name: 'Settings', href: '/settings', icon: Settings, mobileOrder: 8 },
] as const

interface NavigationProps {
  className?: string
}

export function Navigation({ className = '' }: NavigationProps): React.ReactNode {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const pathname = usePathname()

  function isActive(href: string): boolean {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname === href || pathname?.startsWith(href + '/')
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <div className={cn('hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:w-64', className)}>
        <div className="flex flex-col flex-1 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-r border-rose-200/40 dark:border-gray-800 shadow-lg shadow-rose-100/50 dark:shadow-none">
          <div className="flex flex-col flex-1 pt-20 pb-4 overflow-y-auto">
            <nav className="flex-1 px-4 space-y-2">
              {NAVIGATION_ITEMS.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center px-4 py-3 text-sm font-medium rounded-2xl transition-all duration-300 group',
                      active
                        ? 'gradient-primary text-white shadow-lg shadow-rose-200/50'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-rose-50/80 dark:hover:bg-gray-800 hover:text-rose-600',
                    )}
                  >
                    <Icon
                      className={cn(
                        'mr-3 h-5 w-5 flex-shrink-0 transition-transform group-hover:scale-110',
                        active ? 'text-white' : 'text-gray-400 group-hover:text-purple-500',
                      )}
                    />
                    {item.name}
                  </Link>
                )
              })}
            </nav>
            <div className="px-4 pt-4 border-t border-gray-200 dark:border-gray-800">
              <SignOutButton />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-rose-200/40 dark:border-gray-800 shadow-lg safe-area-bottom">
        <nav className="flex justify-around items-center py-2 px-1">
          {[...NAVIGATION_ITEMS]
            .sort((a, b) => a.mobileOrder - b.mobileOrder)
            .slice(0, 4)
            .map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex flex-col items-center justify-center px-3 py-2 text-xs font-medium transition-all duration-300 min-w-0 flex-1 rounded-2xl',
                    active
                      ? 'text-rose-600 bg-rose-50 dark:bg-rose-900/20'
                      : 'text-gray-500 hover:bg-rose-50/60 dark:hover:bg-gray-800',
                  )}
                >
                  <Icon
                    className={cn(
                      'h-5 w-5 mb-1 transition-transform',
                      active ? 'text-rose-600 scale-110' : 'text-gray-400',
                    )}
                  />
                  <span className="truncate">{item.name}</span>
                </Link>
              )
            })}

          {/* More menu button */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="flex flex-col items-center justify-center px-3 py-2 text-xs font-medium text-gray-500 min-w-0 flex-1"
          >
            <Menu className="h-5 w-5 mb-1 text-gray-400" />
            <span className="truncate">More</span>
          </button>
        </nav>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setIsSidebarOpen(false)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setIsSidebarOpen(false)
            }}
            role="button"
            tabIndex={0}
            aria-label="Close menu"
          />
          <div className="fixed inset-y-0 right-0 w-64 bg-white dark:bg-gray-900 shadow-xl">
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Menu</h2>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="flex h-11 w-11 items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                {NAVIGATION_ITEMS.map((item) => {
                  const Icon = item.icon
                  const active = isActive(item.href)
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsSidebarOpen(false)}
                      className={cn(
                        'flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors group',
                        active
                          ? 'bg-pink-50 dark:bg-pink-900/20 text-pink-700 dark:text-pink-400 border border-pink-200 dark:border-pink-800'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800',
                      )}
                    >
                      <Icon
                        className={cn(
                          'mr-3 h-5 w-5 flex-shrink-0',
                          active ? 'text-pink-600' : 'text-gray-400 group-hover:text-gray-500',
                        )}
                      />
                      {item.name}
                    </Link>
                  )
                })}
              </nav>
              <div className="p-4 border-t border-gray-200 dark:border-gray-800">
                <SignOutButton />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
