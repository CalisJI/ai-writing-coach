# Orena Legacy Tombstones

## Governance

**Purpose:** prevent retired product directions from being revived by fresh
agents. **Authority:** human-governed. Agents may add or alter a tombstone only
after explicit human instruction and an accepted Decision Log entry.

**Change when:** a direction is explicitly retired or superseded.
**Do not store:** ordinary defects, temporary blockers, backlog, or
implementation history that has no revival risk. Tombstones must never be
removed merely because current code conflicts with them.

## `/becoming`

- **Status:** DEPRECATED / COMPATIBILITY ONLY
- **Current replacement:** `/`
- **Why retired:** Orena is the canonical product and root route.
- **What may remain:** a bounded redirect/alias and tests proving it resolves to
  `/`; historical references in archived evidence.
- **What must not happen:** new learner navigation, links, screens, feature
  ownership, or product development targeting `/becoming`.

## Historical BECOMING user-facing product identity

- **Status:** RETIRED
- **Current replacement:** Orena
- **Why retired:** the active product identity has transitioned to Orena.
- **What may remain:** historical Decision Log wording, release evidence,
  technical constants, database names, and compatibility artifacts.
- **What must not happen:** learner-facing branding or current product docs may
  not present BECOMING as the active app.

## `static/becoming/**`

- **Status:** LEGACY TECHNICAL NAMESPACE
- **Current replacement:** Orena product behavior served at `/`; migration of
  the namespace itself is not currently required.
- **Why retired:** the path predates the active product identity.
- **What may remain:** current Orena web implementation files while technically
  required.
- **What must not happen:** the directory name must not be interpreted as an
  active product route or authorization to revive BECOMING.

## `templates/becoming/**`

- **Status:** LEGACY TECHNICAL NAMESPACE
- **Current replacement:** Orena root shell.
- **Why retired:** the template path is historical; its active rendered product
  is Orena.
- **What may remain:** the canonical Orena shell template and compatibility
  asset references.
- **What must not happen:** no new `/becoming` product shell or branding may be
  inferred from this path.

## `writing_coach/becoming_*`

- **Status:** LEGACY TECHNICAL NAMESPACE
- **Current replacement:** current Orena domain contracts; broad renaming is not
  required by this tombstone.
- **Why retired:** the module prefix is historical implementation vocabulary.
- **What may remain:** stable modules, imports, API route names, tests, and
  persistence compatibility identifiers.
- **What must not happen:** these symbols must not define current product
  identity, routing, architecture, or a separate learning system.
