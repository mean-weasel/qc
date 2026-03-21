const CONSENT_KEY = 'qc-cookie-consent'

export type ConsentStatus = 'undecided' | 'accepted' | 'declined'

export function getConsentStatus(): ConsentStatus {
  if (typeof window === 'undefined') return 'undecided'
  const value = localStorage.getItem(CONSENT_KEY)
  if (value === 'accepted' || value === 'declined') return value
  return 'undecided'
}

export function setConsentStatus(status: 'accepted' | 'declined'): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(CONSENT_KEY, status)
  window.dispatchEvent(new CustomEvent('cookie-consent-changed', { detail: { status } }))
}

export function clearConsentStatus(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(CONSENT_KEY)
  window.dispatchEvent(new CustomEvent('cookie-consent-changed', { detail: { status: 'undecided' } }))
}
