'use client'

import { useState, useEffect } from 'react'
import { History } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow } from 'date-fns'

interface RecentCheckIn {
  id: string
  categories: string[]
  completed_at: string
  duration_minutes: number | null
}

export function RecentCheckInsSection({ coupleId }: { coupleId: string }): React.ReactNode {
  const [checkIns, setCheckIns] = useState<RecentCheckIn[]>([])
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('check_ins')
        .select('id, categories, completed_at, duration_minutes')
        .eq('couple_id', coupleId)
        .eq('status', 'completed')
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(3)
      if (data) setCheckIns(data as RecentCheckIn[])
    }
    load()
  }, [coupleId, supabase])

  if (checkIns.length === 0) return null

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <History className="h-5 w-5 text-gray-600" />
        Recent Check-ins
      </h2>
      <div className="space-y-3">
        {checkIns.map((ci) => (
          <div key={ci.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <div className="font-medium text-gray-900">
                {ci.categories.length > 0 ? ci.categories.join(', ') : 'General check-in'}
              </div>
              <div className="text-sm text-gray-600">
                {formatDistanceToNow(new Date(ci.completed_at), { addSuffix: true })}
                {ci.duration_minutes ? ` \u2022 ${ci.duration_minutes} minutes` : ''}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
