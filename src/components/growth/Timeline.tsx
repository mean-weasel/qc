'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Filter, ChevronUp, ChevronDown, Award, Target, Heart, TrendingUp } from 'lucide-react'
import { MonthGroupSection } from './TimelineMonthGroup'
import { format, parseISO, compareDesc } from 'date-fns'
import type { Milestone, MilestoneCategory } from '@/types'

type FilterType = 'all' | MilestoneCategory
type SortType = 'newest' | 'oldest' | 'category'

const FILTER_OPTIONS: { type: FilterType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { type: 'all', label: 'All', icon: TrendingUp },
  { type: 'relationship', label: 'Relationship', icon: Heart },
  { type: 'communication', label: 'Communication', icon: Award },
  { type: 'growth', label: 'Growth', icon: TrendingUp },
  { type: 'milestone', label: 'Milestone', icon: Target },
]

interface TimelineProps {
  milestones: Milestone[]
  className?: string
  showFilters?: boolean
  maxVisible?: number
  onMilestoneClick?: (milestone: Milestone) => void
}

function TimelineFilters({
  filter,
  sort,
  onFilterChange,
  onSortChange,
  getFilterCount,
}: {
  filter: FilterType
  sort: SortType
  onFilterChange: (type: FilterType) => void
  onSortChange: (type: SortType) => void
  getFilterCount: (type: FilterType) => number
}): React.ReactElement {
  return (
    <motion.div
      className="mb-8 space-y-4"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex flex-wrap gap-2">
        {FILTER_OPTIONS.map(({ type, label, icon: Icon }) => {
          const count = getFilterCount(type)
          return (
            <Button
              key={type}
              variant={filter === type ? 'default' : 'outline'}
              size="sm"
              onClick={() => onFilterChange(type)}
              className={cn(
                'min-h-[44px] text-xs font-medium transition-all',
                filter === type && 'bg-pink-600 text-white hover:bg-pink-700',
              )}
            >
              <Icon className="mr-1 h-3 w-3" />
              {label}
              <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-xs">{count}</span>
            </Button>
          )
        })}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600 dark:text-gray-400">Sort by:</span>
        <div className="flex gap-1">
          {(['newest', 'oldest', 'category'] as SortType[]).map((sortType) => (
            <Button
              key={sortType}
              variant={sort === sortType ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onSortChange(sortType)}
              className="min-h-[44px] text-xs"
            >
              {sortType === 'newest' && <ChevronDown className="mr-1 h-3 w-3" />}
              {sortType === 'oldest' && <ChevronUp className="mr-1 h-3 w-3" />}
              {sortType === 'category' && <Filter className="mr-1 h-3 w-3" />}
              {sortType.charAt(0).toUpperCase() + sortType.slice(1)}
            </Button>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

function TimelineEmptyState({ filter }: { filter: FilterType }): React.ReactElement {
  return (
    <motion.div
      className="py-12 text-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
        <TrendingUp className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-gray-100">No milestones yet</h3>
      <p className="mx-auto max-w-sm text-gray-600 dark:text-gray-400">
        {filter === 'all'
          ? 'Create your first milestone to start tracking your relationship journey.'
          : `No ${filter} milestones found. Try changing the filter.`}
      </p>
    </motion.div>
  )
}

export function Timeline({
  milestones,
  className,
  showFilters = true,
  maxVisible = 20,
  onMilestoneClick,
}: TimelineProps): React.ReactElement {
  const [filter, setFilter] = useState<FilterType>('all')
  const [sort, setSort] = useState<SortType>('newest')
  const [visibleCount, setVisibleCount] = useState(maxVisible)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  const processedMilestones = useMemo(() => {
    let filtered = milestones

    if (filter !== 'all') {
      filtered = filtered.filter((m) => m.category === filter)
    }

    const sorted = [...filtered].sort((a, b) => {
      const dateA = a.achievedAt ? parseISO(a.achievedAt) : new Date(0)
      const dateB = b.achievedAt ? parseISO(b.achievedAt) : new Date(0)

      switch (sort) {
        case 'newest':
          return compareDesc(dateA, dateB)
        case 'oldest':
          return compareDesc(dateB, dateA)
        case 'category': {
          if (a.category !== b.category) {
            return a.category.localeCompare(b.category)
          }
          return compareDesc(dateA, dateB)
        }
        default:
          return compareDesc(dateA, dateB)
      }
    })

    return sorted
  }, [milestones, filter, sort])

  const groupedByMonth = useMemo(() => {
    const groups = new Map<string, Milestone[]>()

    processedMilestones.forEach((m) => {
      const dateStr = m.achievedAt ?? new Date().toISOString()
      const monthKey = format(parseISO(dateStr), 'yyyy-MM')

      if (!groups.has(monthKey)) {
        groups.set(monthKey, [])
      }
      groups.get(monthKey)!.push(m)
    })

    return Array.from(groups.entries()).map(([key, entries]) => ({
      key,
      displayKey: format(parseISO(key + '-01'), 'MMMM yyyy'),
      entries,
    }))
  }, [processedMilestones])

  const hasMore = processedMilestones.length > visibleCount

  function getFilterCount(filterType: FilterType): number {
    if (filterType === 'all') return milestones.length
    return milestones.filter((m) => m.category === filterType).length
  }

  function toggleGroup(groupKey: string): void {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupKey)) {
        next.delete(groupKey)
      } else {
        next.add(groupKey)
      }
      return next
    })
  }

  return (
    <div className={cn('w-full', className)}>
      {showFilters && (
        <TimelineFilters
          filter={filter}
          sort={sort}
          onFilterChange={setFilter}
          onSortChange={setSort}
          getFilterCount={getFilterCount}
        />
      )}

      {processedMilestones.length === 0 ? (
        <TimelineEmptyState filter={filter} />
      ) : (
        <div className="relative">
          <div className="absolute bottom-0 left-6 top-0 w-0.5 bg-gradient-to-b from-pink-200 via-purple-200 to-pink-200 dark:from-pink-800 dark:via-purple-800 dark:to-pink-800" />

          <div className="space-y-6">
            {groupedByMonth.map((group, groupIndex) => (
              <MonthGroupSection
                key={group.key}
                group={group}
                groupIndex={groupIndex}
                isExpanded={expandedGroups.has(group.key)}
                onToggle={() => toggleGroup(group.key)}
                onMilestoneClick={onMilestoneClick}
              />
            ))}
          </div>

          {hasMore && (
            <div className="mt-6 text-center">
              <Button
                variant="outline"
                onClick={() => setVisibleCount((prev) => Math.min(prev + maxVisible, processedMilestones.length))}
              >
                Load More
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
