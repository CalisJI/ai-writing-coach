# Writing Coach Platform Architecture — v0.9

## Goal

One learning platform, reusable infrastructure, multiple language modules.

```text
Account
  |
shared platform core
  |
language registry
  |-- English (ready)
  `-- Chinese (planned)
```

## Hard rules

1. Never copy the whole English app to create another language.
2. Auth, sessions, user isolation, Docker, updates and account UI are shared core.
3. Each language owns evaluator logic, level system, curriculum and diagnostics.
4. Data is isolated by **user + language**.
5. Existing English endpoints remain compatibility endpoints until versioned replacements exist.
6. Migrations are additive; updater code must never delete user data.
7. A language stays disabled until evaluator/content/regression tests are complete.
8. Browser JavaScript belongs in `/static`, not a giant inline block.
9. Static assets are served by one `StaticFiles` mount, not one route per file.
10. Architecture validation and CI are required for every structural change.

## Data layout

```text
/data/
  writing.db                    # historical local English DB
  auth.db
  users/
    <user-hash>/
      writing.db                # v0.8 English backup/compatibility file
      en/writing.db             # canonical English DB from v0.9
      zh/writing.db             # future Chinese DB
```

Old authenticated English data is copied once into `en/writing.db`; the old file is retained as a recovery copy.

## Shared score contract

The platform keeps five high-level dimensions stable:

- grammar
- vocabulary
- coherence
- task achievement
- naturalness

Language-specific concepts belong to the language module's error taxonomy and module metadata.

## Adding a language

1. Create `writing_coach/languages/<language>/profile.py`.
2. Register it in `writing_coach/core/language_registry.py`.
3. Keep `enabled=False`.
4. Implement evaluator, tasks, curriculum, vocabulary tools and tests.
5. Use shared user+language storage.
6. Add language-specific regression tests.
7. Only then set `enabled=True`.

The sidebar selector reads the registry dynamically, so enabling a complete module does not require rebuilding auth/account infrastructure.

## Compatibility strategy

`app.py` remains the English compatibility adapter during the transition. New multilingual code belongs under `writing_coach/`. This incremental approach avoids a risky rewrite of a working product.

## Platform AI engine

AI-provider selection is a developer/admin concern, not a learner preference.

- one active provider/model is used by the whole platform
- selection lives in /data/platform.db, not in learner databases
- only persistent admin-role accounts can call /api/admin/*
- BOOTSTRAP_OWNER_EMAIL is automatically promoted to admin
- API keys are server-managed and never returned to browsers
- ordinary learners see only generic AI Coach availability
- there is no automatic failover from local AI to a paid cloud provider
- language modules call writing_coach.ai.platform.generate_structured()
- adding a provider means adding an adapter, not rewriting language modules


## AI model administration UX

The learner UI remains provider-neutral. Only persistent Platform Admin accounts
see the AI Models dashboard. The dashboard discovers models through provider
adapters, shows the current global model, allows explicit connection tests, and
requires an explicit admin action before changing the platform model.

Adding or installing a model must not require changes in English/Chinese modules.
Ollama models are discovered dynamically; cloud model availability is supplied by
the provider adapter/server configuration. Paid provider failover remains disabled.


## Chinese module v1.0

Chinese is an enabled language module sharing auth, global AI provider selection,
history/analytics infrastructure and user isolation with English.

The first Chinese release supports writing, task generation, improvement and analytics.
Its HSK label is an internal learning-band estimate, not an official HSK exam score.
Chinese grammar library and pinyin/dictionary tooling remain separate follow-up modules.


## Chinese Learning Library v1.1

Chinese grammar, dictionary, pinyin, translation and saved vocabulary are owned by the Chinese language module but reuse shared platform infrastructure.

- Chinese curriculum metadata lives in `writing_coach/languages/chinese/grammar_course.py`
- `app.py` selects grammar content through the language runtime rather than importing English curriculum directly
- lesson progress/cache and vocabulary remain isolated by user + language
- Chinese dictionary uses the active global AI provider and never exposes provider secrets
- pinyin is a learning aid generated with dictionary content; ambiguous readings should be interpreted in context
- HSK labels remain internal learning bands, not official exam scores
