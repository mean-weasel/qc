'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface BasicTextInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  helperText?: string
  maxLength?: number
  onSave?: () => void
  autoSave?: boolean
  autoSaveDelay?: number
}

export function BasicTextInput({
  value,
  onChange,
  placeholder,
  label,
  helperText,
  maxLength = 2000,
  onSave,
  autoSave = false,
  autoSaveDelay = 3000,
}: BasicTextInputProps): React.ReactElement {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fadeRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const triggerSave = useCallback(() => {
    if (!onSave) return
    setSaveStatus('saving')
    onSave()
    setSaveStatus('saved')
    fadeRef.current = setTimeout(() => setSaveStatus('idle'), 2000)
  }, [onSave])

  useEffect(() => {
    if (!autoSave || !onSave || !value) return

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(triggerSave, autoSaveDelay)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [value, autoSave, autoSaveDelay, onSave, triggerSave])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (fadeRef.current) clearTimeout(fadeRef.current)
    }
  }, [])

  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-medium text-foreground">{label}</label>}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={4}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y min-h-[100px]"
      />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{helperText}</span>
        <div className="flex items-center gap-2">
          {saveStatus === 'saving' && <span className="text-muted-foreground">Saving...</span>}
          {saveStatus === 'saved' && <span className="text-green-600 dark:text-green-400">Saved</span>}
          <span>
            {value.length} / {maxLength}
          </span>
        </div>
      </div>
    </div>
  )
}
