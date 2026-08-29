import {z} from 'zod';

const languageOptionSchema = z.object({
  code: z.enum(['en', 'zh']),
  name: z.string().min(1),
  native_name: z.string().min(1),
}).strict();

export const sessionBootstrapSchema = z.object({
  version: z.literal('orena.session-bootstrap.v1'),
  authenticated: z.literal(true),
  mode: z.enum(['google', 'local']),
  user: z.object({
    role: z.enum(['user', 'admin']),
    is_admin: z.boolean(),
  }).strict(),
  language: z.object({
    active: z.enum(['en', 'zh']),
    options: z.array(languageOptionSchema).min(1),
  }).strict(),
}).strict();

export type SessionBootstrap = z.infer<typeof sessionBootstrapSchema>;
