'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { StaggerContainer, StaggerItem } from '@/components/ui/motion'
import { Calendar, ChevronUp, ChevronDown } from 'lucide-react'
import { MilestoneCard } from './MilestoneCard'
import type { Milestone } from '@/types'

export interface MonthGroup {
  key: string
  displayKey: string
  entries: Milestone[]
}

interface MonthGroupSectionProps {
  group: MonthGroup
  groupIndex: number
  isExpanded: boolean
  onToggle: () => void
  onMilestoneClick?: (milestone: Milestone) => void
}

export function MonthGroupSection({
  group,
  groupIndex,
  isExpanded,
  onToggle,
  onMilestoneClick,
}: MonthGroupSectionProps): React.ReactElement {
  return (
    <motion.div
      key={group.key}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: groupIndex * 0.1 }}
    >
      {/* Month header */}
      <div className="relative mb-4 flex items-center">
        <div className="absolute left-6 z-10 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-white bg-pink-500 shadow-md" />
        <div className="ml-12">
          <button
            onClick={onToggle}
            className="flex min-h-[44px] items-center gap-2 text-lg font-semibold text-gray-900 transition-colors hover:text-pink-600 dark:text-gray-100"
          >
            <Calendar className="h-5 w-5" />
            {group.displayKey}
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            <span className="text-sm font-normal text-gray-500">
              ({group.entries.length} {group.entries.length === 1 ? 'milestone' : 'milestones'})
            </span>
          </button>
        </div>
      </div>

      {/* Month entries */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <StaggerContainer className="ml-12 space-y-4">
              {group.entries.map((milestone) => (
                <StaggerItem key={milestone.id}>
                  <MilestoneCard milestone={milestone} variant="default" onClick={onMilestoneClick} />
                </StaggerItem>
              ))}
            </StaggerContainer>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
