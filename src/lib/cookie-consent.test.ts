import { describe, it, expect, beforeEach, vi } from 'vitest'

import { getConsentStatus, setConsentStatus, clearConsentStatus } from './cookie-consent'

describe('cookie-consent', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns undecided by default', () => {
    expect(getConsentStatus()).toBe('undecided')
  })

  it('returns accepted after setConsentStatus("accepted")', () => {
    setConsentStatus('accepted')
    expect(getConsentStatus()).toBe('accepted')
  })

  it('returns declined after setConsentStatus("declined")', () => {
    setConsentStatus('declined')
    expect(getConsentStatus()).toBe('declined')
  })

  it('dispatches cookie-consent-changed event on set', () => {
    const handler = vi.fn()
    window.addEventListener('cookie-consent-changed', handler)
    setConsentStatus('accepted')
    expect(handler).toHaveBeenCalledTimes(1)
    expect((handler.mock.calls[0][0] as CustomEvent).detail.status).toBe('accepted')
    window.removeEventListener('cookie-consent-changed', handler)
  })

  it('returns undecided after clearConsentStatus', () => {
    setConsentStatus('accepted')
    clearConsentStatus()
    expect(getConsentStatus()).toBe('undecided')
  })
})
