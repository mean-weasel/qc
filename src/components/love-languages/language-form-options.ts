import type { LoveLanguageCategory, LoveLanguageImportance, LoveLanguagePrivacy } from '@/types'

export const IMPORTANCE_OPTIONS: { value: LoveLanguageImportance; label: string; hint: string; id: string }[] = [
  { value: 'low', label: 'Low', hint: 'Nice to have', id: 'll-low' },
  { value: 'medium', label: 'Medium', hint: 'Important to me', id: 'll-med' },
  { value: 'high', label: 'High', hint: 'Very important', id: 'll-hi' },
  { value: 'essential', label: 'Essential', hint: 'Critical for feeling loved', id: 'll-ess' },
]

export const PRIVACY_OPTIONS: { value: LoveLanguagePrivacy; label: string; hint: string; id: string }[] = [
  { value: 'private', label: 'Private', hint: 'Only visible to me', id: 'll-priv' },
  { value: 'shared', label: 'Shared with partner', hint: 'Visible to your partner', id: 'll-shared' },
]

export const CATEGORY_OPTIONS: { value: LoveLanguageCategory; label: string; emoji: string }[] = [
  { value: 'words', label: 'Words of Affirmation', emoji: '\uD83D\uDCAC' },
  { value: 'acts', label: 'Acts of Service', emoji: '\uD83E\uDD1D' },
  { value: 'gifts', label: 'Receiving Gifts', emoji: '\uD83C\uDF81' },
  { value: 'time', label: 'Quality Time', emoji: '\u23F0' },
  { value: 'touch', label: 'Physical Touch', emoji: '\uD83E\uDD17' },
  { value: 'custom', label: 'Custom', emoji: '\u2728' },
]
