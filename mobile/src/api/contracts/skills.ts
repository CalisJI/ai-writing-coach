import {z} from 'zod';

/**
 * `GET /api/platform/skills` — the language-wide skill release contract.
 *
 * The web hides Write, Read, Listen and Speak until this reports the skill
 * available (`static/becoming/domain/skill-release.js`), so the native shell
 * needs the same evidence or it advertises destinations the product has not
 * released.
 */
export const skillSchema = z.object({
  key: z.string().min(1).max(64),
  release_state: z.string().min(1).max(32),
  source_available: z.boolean(),
  internal_available: z.boolean(),
  public_available: z.boolean(),
}).strict();

export const skillReleaseSchema = z.object({
  api_version: z.number().int().positive(),
  policy: z.string().min(1).max(64),
  language_scope: z.array(z.enum(['en', 'zh'])),
  skills: z.array(skillSchema),
}).strict();

export type Skill = z.infer<typeof skillSchema>;
export type SkillRelease = z.infer<typeof skillReleaseSchema>;

/** `SKILL_BY_ROUTE` from skill-release.js, keyed by native route. */
export const SKILL_BY_ROUTE: Readonly<Record<string, string>> = {
  '/(app)/writing': 'writing',
  '/(app)/review': 'writing',
  '/(app)/reading': 'reading',
  '/(app)/listening': 'listening',
  '/(app)/speaking': 'speaking',
};

/** Mirrors `skillAvailable`: an unknown skill is not available. */
export function skillAvailable(skill: Skill | undefined, {internal = false}: {internal?: boolean} = {}): boolean {
  if (!skill) return false;
  return internal ? skill.internal_available === true : skill.public_available === true;
}

/** Mirrors `routeAvailable`: a route with no skill gate is always available. */
export function routeAvailable(route: string, skills: readonly Skill[] | undefined, {internal = false}: {internal?: boolean} = {}): boolean {
  const key = SKILL_BY_ROUTE[route];
  if (!key) return true;
  return skillAvailable(skills?.find((skill) => skill.key === key), {internal});
}
