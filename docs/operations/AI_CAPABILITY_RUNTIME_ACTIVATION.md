# AI Capability Runtime Activation

This runbook prepares the atomic learner routing transition from `LEGACY` to
`CAPABILITY`. **STATIC READINESS PASS != PRODUCTION ACTIVATION APPROVAL.**
Every production mutation, live provider check, and runtime switch below marked
**HUMAN GATE** requires explicit human authorization.

## PHASE 0 — Prerequisites

- Use the reviewed application image and PostgreSQL authoritative runtime.
- Confirm `PERSISTENCE_BACKEND=postgresql` and current `AI_RUNTIME_MODE=legacy`.
- Preserve `ai.active_selection` and all existing capability configuration.
- Do not use SQLite, run Alembic, expose secrets, or probe a provider in static phases.

## PHASE 1 — Migration DRY RUN

Read-only preview:

```bash
python scripts/migrate_ai_capability_config.py --dry-run
```

Review the proposed eight capability rows and approved fallback policies.

## PHASE 2 — HUMAN-authorized migration

**HUMAN GATE — DO NOT execute as part of readiness preparation.**

After authorization, an operator may run the same migration without
`--dry-run`. It creates missing rows only and does not overwrite existing rows.

## PHASE 3 — Static capability config validation

```bash
python scripts/validate_ai_capability_control_plane.py
```

This checks persisted configuration against code-owned capability/provider
metadata. It does not perform provider discovery or generation.

## PHASE 4 — Activation-readiness gate

```bash
python scripts/validate_ai_runtime_activation.py
```

A pass requires PostgreSQL, current `LEGACY` mode, exactly eight enabled shared
capability configs, static provider compatibility, and the approved fallback
policy set. Output is secret-safe JSON. The command is read-only and does not
migrate, initialize storage, change runtime mode, or call providers.

## PHASE 5 — Explicit HUMAN-authorized LIVE validation

**HUMAN GATE.** Separately authorize the reviewed provider credential, model
discovery, and capability live-test procedure. Static readiness does not prove
credential presence, model availability, provider health, or production
activation approval. Do not automatically make eight paid requests.

## PHASE 6 — Explicit HUMAN activation

**HUMAN GATE.** Change the single learner runtime mode atomically:

`LEGACY → CAPABILITY`

Do not alter capability rows, legacy selection, credentials, or schema during
the switch.

## PHASE 7 — Smoke verification

After authorized activation, verify representative EN and ZH learner workloads
use their exact persisted capability provider/model and fail closed. Confirm no
legacy selection or provider-to-provider fallback is used in `CAPABILITY` mode.

## PHASE 8 — Rollback if needed

**HUMAN GATE.** Atomically restore:

`CAPABILITY → LEGACY`

Rollback must preserve capability rows and credentials. It does not restore
SQLite, rewrite provider credentials, remove capability configuration, require
a schema rollback or reverse data migration, or remove legacy routing. Diagnose
before considering another activation attempt.
