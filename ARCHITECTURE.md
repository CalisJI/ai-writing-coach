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
