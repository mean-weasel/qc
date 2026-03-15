'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'

import { requireAuth } from '@/lib/auth'
import { createCouple, createInvite } from '@/lib/couples'
import { sendEmail, shouldSendEmail } from '@/lib/email/send'
import { InviteEmail } from '@/lib/email/templates/invite'
import { WelcomeEmail } from '@/lib/email/templates/welcome'
import { createClient } from '@/lib/supabase/server'
import { validate, emailSchema, nameSchema } from '@/lib/validation'

const onboardingSchema = z.object({
  displayName: nameSchema,
  partnerEmail: emailSchema,
  relationshipStartDate: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), { message: 'Invalid date format' })
    .refine((val) => !val || new Date(val) <= new Date(), { message: 'Date cannot be in the future' }),
  selectedLanguages: z.string().optional(),
  preferences: z.string().optional(),
  reminderDay: z.string().optional(),
  reminderTime: z.string().optional(),
})

const preferencesSchema = z.object({
  communicationStyle: z.string().min(1),
  checkInFrequency: z.string().min(1),
  sessionStyle: z.string().min(1),
})

const LANGUAGE_TITLES: Record<string, string> = {
  words: 'Words of Affirmation',
  acts: 'Acts of Service',
  gifts: 'Receiving Gifts',
  time: 'Quality Time',
  touch: 'Physical Touch',
  custom: 'Custom',
}

export type OnboardingState = {
  error: string | null
  success?: boolean
  emailSent?: boolean
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

async function saveLoveLanguages(
  supabase: SupabaseClient,
  rawLanguages: string,
  coupleId: string,
  userId: string,
): Promise<void> {
  const languageResult = z.array(z.string()).safeParse(
    (() => {
      try {
        return JSON.parse(rawLanguages)
      } catch {
        return null
      }
    })(),
  )

  if (languageResult.success && languageResult.data.length > 0) {
    const languageRows = languageResult.data.map((category) => ({
      couple_id: coupleId,
      user_id: userId,
      // eslint-disable-next-line security/detect-object-injection -- category is from user-selected values validated by Zod
      title: LANGUAGE_TITLES[category] ?? category,
      category,
      privacy: 'shared' as const,
      importance: 'high' as const,
    }))
    await supabase.from('love_languages').insert(languageRows)
  }
}

async function savePreferences(supabase: SupabaseClient, rawPreferences: string, coupleId: string): Promise<void> {
  const parsed = JSON.parse(rawPreferences)
  const prefResult = preferencesSchema.safeParse(parsed)
  if (prefResult.success) {
    await supabase
      .from('couples')
      .update({
        settings: {
          communicationStyle: prefResult.data.communicationStyle,
          checkInFrequency: prefResult.data.checkInFrequency,
          sessionStyle: prefResult.data.sessionStyle,
        },
      })
      .eq('id', coupleId)
  }
}

async function createDefaultReminder(
  supabase: SupabaseClient,
  coupleId: string,
  userId: string,
  day: string,
  time: string,
): Promise<void> {
  const [hours, minutes] = time.split(':').map(Number)
  const dayIndex = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(day)
  const now = new Date()
  const nextDate = new Date(now)
  nextDate.setHours(hours, minutes, 0, 0)
  const currentDay = now.getDay()
  let daysUntil = (dayIndex - currentDay + 7) % 7
  if (daysUntil === 0 && nextDate <= now) daysUntil = 7
  nextDate.setDate(nextDate.getDate() + daysUntil)

  await supabase.from('reminders').insert({
    couple_id: coupleId,
    created_by: userId,
    title: 'Weekly Check-in',
    message: 'Time for your check-in!',
    category: 'check-in',
    frequency: 'weekly',
    scheduled_for: nextDate.toISOString(),
    notification_channel: 'both',
    is_active: true,
    custom_schedule: { dayOfWeek: day, time },
  })
}

export async function completeOnboarding(_prev: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const { user } = await requireAuth()

  const raw = {
    displayName: formData.get('displayName'),
    partnerEmail: formData.get('partnerEmail'),
    relationshipStartDate: formData.get('relationshipStartDate') || undefined,
    selectedLanguages: formData.get('selectedLanguages') || undefined,
    preferences: formData.get('preferences') || undefined,
    reminderDay: formData.get('reminderDay') || undefined,
    reminderTime: formData.get('reminderTime') || undefined,
  }

  const { data: input, error: validationError } = validate(onboardingSchema, raw)

  if (validationError || !input) {
    return { error: validationError ?? 'Validation failed' }
  }

  const supabase = await createClient()
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ display_name: input.displayName })
    .eq('id', user.id)

  if (profileError) {
    return { error: 'Failed to update profile. Please try again.' }
  }

  const { data: couple, error: coupleError } = await createCouple(input.displayName, supabase)

  if (coupleError || !couple) {
    return { error: coupleError ?? 'Failed to create couple. Please try again.' }
  }

  if (input.relationshipStartDate) {
    await supabase.from('couples').update({ relationship_start_date: input.relationshipStartDate }).eq('id', couple.id)
  }

  // Non-blocking optional saves
  if (input.selectedLanguages) {
    try {
      await saveLoveLanguages(supabase, input.selectedLanguages, couple.id, user.id)
    } catch {
      // Love language insertion failed -- non-blocking
    }
  }

  if (input.preferences) {
    try {
      await savePreferences(supabase, input.preferences, couple.id)
    } catch {
      // Preferences save failed -- non-blocking
    }
  }

  if (input.reminderDay && input.reminderTime) {
    try {
      await createDefaultReminder(supabase, couple.id, user.id, input.reminderDay, input.reminderTime)
    } catch {
      // Reminder creation failed -- non-blocking
    }
  }

  // Create invite and send emails
  const { data: invite, error: inviteError } = await createInvite(input.partnerEmail, supabase)

  if (inviteError || !invite) {
    return { error: null, success: true, emailSent: false }
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const inviteUrl = `${baseUrl}/invite/${invite.token}`

  let inviteEmailSent = true
  try {
    await sendEmail({
      to: input.partnerEmail,
      subject: `${input.displayName} invited you to QC`,
      react: InviteEmail({ inviterName: input.displayName, inviteUrl }),
    })
  } catch {
    inviteEmailSent = false
  }

  if (user.email) {
    try {
      const canSend = await shouldSendEmail(user.email)
      if (canSend) {
        await sendEmail({
          to: user.email,
          subject: 'Welcome to QC',
          react: WelcomeEmail({ name: input.displayName, dashboardUrl: `${baseUrl}/dashboard` }),
        })
      }
    } catch {
      // Welcome email send failed -- non-blocking
    }
  }

  if (!inviteEmailSent) {
    return { error: null, success: true, emailSent: false }
  }

  redirect('/dashboard')
}
