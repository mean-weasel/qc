import { createAdminClient } from '@/lib/supabase/admin'

interface RateLimiterConfig {
  maxRequests: number
  windowSeconds: number
  failClosed?: boolean
}

export function createRateLimiter(config: RateLimiterConfig) {
  return {
    async check(key: string): Promise<boolean> {
      const supabase = createAdminClient()
      const { data, error } = await supabase.rpc('check_rate_limit', {
        p_key: key,
        p_max_requests: config.maxRequests,
        p_window_seconds: config.windowSeconds,
      })
      if (error) {
        console.error('Rate limit check failed:', error)
        return !config.failClosed
      }
      return data as boolean
    },
  }
}
