import {z} from 'zod';

const entitlementSchema = z.object({
  key: z.string().min(1).max(120),
  enabled: z.boolean(),
  monthly_limit: z.number().int().nonnegative().nullable(),
}).strict();

export const productPlanSchema = z.object({
  id: z.enum(['free', 'premium']),
  name: z.string().min(1).max(120),
  description: z.string().max(500),
  price_label: z.string().max(120),
  entitlements: z.array(entitlementSchema),
}).strict();

export const featureAccessSchema = z.object({
  key: z.string().min(1).max(120),
  enabled: z.boolean(),
  monthly_limit: z.number().int().nonnegative().nullable(),
  used: z.number().int().nonnegative(),
  remaining: z.number().int().nonnegative().nullable(),
  usage_state: z.enum(['known', 'unavailable']),
  entitlement_state: z.enum(['enabled', 'exhausted', 'disabled', 'unknown', 'unavailable']),
}).strict();

export const productAccountStateSchema = z.object({
  available: z.boolean(),
  plan: productPlanSchema.nullable(),
  subscription: z.object({
    state: z.enum(['active', 'inactive', 'unknown']),
    status: z.string().min(1).max(80),
  }).strict(),
  plan_state: z.enum(['active', 'default', 'unknown']).optional(),
  features: z.record(featureAccessSchema),
  billing_ready: z.literal(false),
}).strict();

export type ProductAccountState = z.infer<typeof productAccountStateSchema>;
export type FeatureAccess = z.infer<typeof featureAccessSchema>;
