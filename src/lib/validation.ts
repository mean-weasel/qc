import { z } from 'zod'

export const emailSchema = z.string().email('Please enter a valid email address').min(1, 'Email is required')

export const nameSchema = z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less')

export const createItemSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
  description: z.string().max(2000, 'Description must be 2000 characters or less').optional(),
})

/** @public */
export const updateItemSchema = createItemSchema.partial()

export const milestoneSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  category: z.string().max(50).optional(),
  rarity: z.enum(['common', 'rare', 'epic', 'legendary']).optional(),
  points: z.number().min(5).max(100).optional(),
  icon: z
    .string()
    .max(10)
    .refine((val) => !val || /\S/.test(val.replace(/[\u200B-\u200D\uFEFF]/g, '')), 'Icon must contain a visible character')
    .optional(),
})

export const loveActionSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  language_id: z.string().uuid(),
  status: z.enum(['suggested', 'planned', 'recurring']).optional(),
  frequency: z.enum(['once', 'weekly', 'monthly', 'surprise']).optional(),
  difficulty: z.enum(['easy', 'moderate', 'challenging']).optional(),
})

interface ValidateSuccess<T> {
  data: T
  error?: undefined
}

interface ValidateError {
  data?: undefined
  error: string
}

type ValidateResult<T> = ValidateSuccess<T> | ValidateError

export function validate<T>(schema: z.ZodSchema<T>, input: unknown): ValidateResult<T> {
  const result = schema.safeParse(input)

  if (result.success) {
    return { data: result.data }
  }

  const message = result.error.issues.map((e: { message: string }) => e.message).join(', ')
  return { error: message }
}
