import { z } from 'zod'

const identifier = z.string().trim().min(1).max(128)

export const productTypeSchema = z.enum(['MAIN', 'SIDE', 'SUPPLEMENT', 'STANDALONE'])

export const productInputSchema = z.object({
  restaurantId: identifier.optional(),
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(1_000).default(''),
  category: z.string().trim().min(1).max(80),
  productType: productTypeSchema,
  sideCategory: z.enum(['STARTER', 'DESSERT']).optional(),
  priceCents: z.number().int().min(0).max(100_000),
  socialEligible: z.boolean().default(false),
  imageUrl: z.string().trim().max(500).default('/placeholder.png'),
  allergens: z.array(z.string().trim().min(1).max(80)).max(50).default([]),
  active: z.boolean().default(true),
})

export const productPatchSchema = productInputSchema.partial().omit({ restaurantId: true })

export type ProductInput = z.infer<typeof productInputSchema>
export type ProductPatch = z.infer<typeof productPatchSchema>
