# BECOMING Public Product Release Roadmap

## Multilingual invariant

**All learner-facing features and shared product behavior are multilingual by default.**

**A shared feature MUST apply to all supported learning languages.**

English and Chinese are the supported learning languages for the first public
release. Shared navigation, page structure, states, progress, history, learning
memory, evaluation presentation, responsive behavior, accessibility, and
account/product behavior therefore apply to both languages. Language-specific
adapters are reserved for behavior the language itself requires, such as
English word and phoneme rules or Chinese Hanzi, Pinyin, tone, particle, and
measure-word behavior.

Skill release state is product-wide. It is not independently declared for
English and Chinese. A future language must implement the shared skill
contract instead of receiving a copied feature.

## Public Product R1

- Writing: COMPLETE target.
- Speaking: COMPLETE target.
- English + Chinese: mandatory release coverage for both public core skills.

R0 establishes the release contract only. It does not claim that Speaking is
implemented or complete. Promotion to PUBLIC is a later release-gate action,
after both Writing and Speaking are complete for English and Chinese.

## Current R0 truth

- Writing is BETA and internal-only during this pre-release stage.
- Speaking is in development and is not available yet.
- Reading is development/internal; its implementation,
  routes, APIs, and data remain intact without a Public R1 claim.
- Listening remains hidden future work.
- Home, Library, Journey, and Profile are supporting product capabilities,
  not learner skill release labels.

## Post-R1

- Reading completion and public release.
- Listening completion and public release.
- Speaking Advanced / Shadowing.
- Retention & Growth stage.
