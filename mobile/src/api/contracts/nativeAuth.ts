import {z} from 'zod';

export const nativeSessionExchangeSchema = z.object({
  version: z.literal('orena.native-session.v1'),
  session_cookie: z.string().min(1),
}).strict();

export type NativeSessionExchange = z.infer<typeof nativeSessionExchangeSchema>;

export const logoutResponseSchema = z.object({ok: z.literal(true)}).strict();
