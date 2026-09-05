---
name: load-context
description: Compatibility alias for the bounded Orena repository-memory restore. Prefer /resume-orena.
---

Follow `.claude/commands/resume-orena.md` exactly. It reads the compact canonical
memory set, checks live Git state, loads only the relevant Product Map and
Roadmap sections, and emits the bounded resume summary. Do not load archived
handoffs or the complete historical governance set.
