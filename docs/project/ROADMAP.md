# Canonical Multi-Agent Roadmap

This is the canonical program sequence for coordinated work. Status changes
require approval and must remain consistent with `PROJECT_STATE.md` and
`CURRENT_HANDOFF.md`.

## Program status

| Stage | Scope | Status |
| --- | --- | --- |
| R0 | Product Release Architecture | CLOSED |
| R1 | Production Staging + Cloudflare + Google OAuth | CLOSED |
| R2 | AI Capability Control Plane | IN PROGRESS |
| M1 | Media Learning Foundation (cross-cutting) | IN PROGRESS |
| R3 | Writing Evaluation Completion | PLANNED |
| R4 | Multilingual Writing Language Lens | PLANNED |
| R5 | Grammar Knowledge System | PLANNED |
| R6 | Speaking Core | PLANNED |
| R7 | Speaking Evaluation Completion | PLANNED |
| R8 | Public Product Gate: Writing + Speaking EN/ZH | PLANNED |
| R9 | Speaking Advanced / Shadowing Studio | PLANNED |
| R10 | Reading Completion → separate public release | PLANNED |
| R11 | Listening Completion → separate public release | PLANNED |
| R12 | Retention & Growth | PLANNED |

## R0 — Product Release Architecture

**CLOSED.** Established one product-wide skill release contract, truthful
pre-public skill states, shared route ownership, and the first public product
gate.

## R1 — Production Staging + Cloudflare + Google OAuth

**CLOSED / PASS.** Established public staging, canonical Docker Cloudflare
Tunnel connectivity, Google OAuth, PostgreSQL-backed product reads, and EN/ZH
staging smoke evidence. Reopen only for a new concrete failure.

## R2 — AI Capability Control Plane

**IN PROGRESS.**

- Slice 1 — capability and provider contracts: **CLOSED**.
- Slice 2 — capability configuration persistence and operator migration
  tooling: **CLOSED**.
- Slice 3 — capability-centric admin API and live capability test:
  **CLOSED**.
- Atomic learner runtime activation: **REMAINING / HUMAN GATE**.

Do not mark R2 closed until activation, migration/config initialization,
rollback design, and production evidence pass an explicit reviewed gate.

## M1 — Media Learning Foundation (cross-cutting)

**IN PROGRESS.** M1.1 starts M1 by establishing one provider-neutral
media-content foundation that Listening, Speaking Shadowing, Vocabulary /
Library, and Grammar can reuse:

- M1.1 — media object and segment contracts;
- M1.2 — media ingestion and transcript acquisition;
- M1.3 — translation;
- M1.4 — Listening MVP;
- M1.5 — active Listening;
- M1.6 — Shadowing integration.

M1 permits Listening MVP development before R11 without making Listening
public. R11 remains the Listening completion and public-release-readiness gate.
R9 remains advanced Shadowing completion, not the first point at which shared
media learning may exist.

## R3–R7 — Complete the first public learning product

R3 completes Writing evaluation quality and evidence contracts. R4 strengthens
the shared multilingual Writing contract with language-specific lenses only
where linguistically necessary. R5 establishes the Grammar knowledge system.
R6 builds Speaking Core. R7 completes Speaking evaluation.

These stages must preserve one shared product flow for EN and ZH rather than
forking independent language products.

## R8 — Public Product Gate: Writing + Speaking EN/ZH

Public release requires all four conditions:

- Writing COMPLETE;
- Speaking COMPLETE;
- English PASS;
- Chinese PASS.

Only a reviewed release-gate action may promote Writing and Speaking to
PUBLIC. Neither skill is public before this gate.

## R9–R12 — Later product releases and growth

R9 completes advanced Speaking / Shadowing Studio after the first public core
is stable; shared media foundations and early Shadowing integration may already
exist through M1. R10 completes and separately releases Reading. R11 completes
Listening and is its separate public-release-readiness gate, although M1 may
deliver a non-public Listening MVP earlier. R12 focuses on retention and growth
without weakening learning or multilingual contracts.

## Multilingual roadmap principle

All shared learner behavior is multilingual by default. EN and ZH are the
mandatory languages for the first public product. Use shared capabilities and
flows, plus language adapters for genuine linguistic differences. Future
languages implement the same shared contract.

[`docs/PUBLIC_PRODUCT_RELEASE_ROADMAP.md`](../PUBLIC_PRODUCT_RELEASE_ROADMAP.md)
remains supporting release-contract and historical R0 context. This document
is the canonical multi-agent program roadmap.
