import { z } from 'zod'

export const demoLoginSchema = z
  .object({
    email: z.string().trim().email().max(254),
  })
  .strict()

export type DemoLoginInput = z.infer<typeof demoLoginSchema>

const passwordSchema = z
  .string()
  .min(12, 'Le mot de passe doit contenir au moins 12 caractères')
  .max(128, 'Le mot de passe est trop long')
  .refine((value) => /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value), {
    message: 'Le mot de passe doit contenir une majuscule, une minuscule et un chiffre',
  })

export const registerSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
    name: z.string().trim().min(2).max(80),
    password: passwordSchema,
  })
  .strict()

export const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
    password: z.string().min(1).max(128),
  })
  .strict()

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
