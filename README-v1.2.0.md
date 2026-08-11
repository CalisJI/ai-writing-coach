# Writing Coach v1.2.0 — SaaS Product Foundation

This release starts the transition from a local-style app shell to a multi-user product architecture.

## Included

### Product architecture
- Free/Premium product catalog
- entitlement keys and monthly-limit model
- centralized product repository interface
- transitional `/data/product.db`
- subscription-state and usage-event tables
- `/api/product/me`
- `/api/product/plans`
- no direct `user.premium` coupling
- no billing vendor coupling

### UX/product shell
- cleaner light-first default UI
- technical model/provider status removed from learner-facing shell
- language selector moved into the top bar
- appearance controls moved into the account menu
- learner-facing plan badge
- simplified navigation: Home, Write, My writing, Library, Progress
- personalized “Your next step” dashboard card
- improved spacing, cards, editor focus, mobile navigation and responsive layout
- product-oriented login screen
- removes the “Data stays in local SQLite.” message

## Not included yet

- payment checkout
- billing webhooks
- premium enforcement
- PostgreSQL migration
- React/Vite migration

Those are intentionally separate milestones so product behavior can be stabilized before the storage/billing cutover.
