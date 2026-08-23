"""PreToolUse/Bash guard: block the AGENTS.md sec.7 (Git safety) and sec.8
(Docker safety) forbidden commands. Deny is advisory-proof, not a sandbox --
it stops the accidental case, which is the one that destroys data here."""
import json
import re
import sys

RULES = [
    (r"docker(\s+compose|-compose)\b[^|;&]*\bdown\b[^|;&]*(\s-v\b|--volumes\b)",
     "`docker compose down -v` destroys the shared ai-writing-coach-data and "
     "ai-writing-coach-postgres-data volumes (AGENTS.md 8). Use `docker compose down` "
     "without -v, or `docker compose stop`."),
    (r"docker\s+volume\s+(rm|prune)\b",
     "Deleting Docker volumes is forbidden -- they hold PostgreSQL runtime data and "
     "frozen SQLite archives (AGENTS.md 8)."),
    (r"\bgit\s+clean\b[^|;&]*\s-(?!-)[a-z]*[fdx]",
     "`git clean -fd` is forbidden: docs/visual-references/** are legitimate untracked "
     "assets and must not be deleted as cleanup (AGENTS.md 7)."),
    (r"\bgit\s+add\s+(-A\b|--all\b|\.(\s|$))",
     "Blanket `git add` is forbidden -- stage only files belonging to the current "
     "coherent change (AGENTS.md 7). Name the paths explicitly."),
    (r"\bgit\s+reset\b[^|;&]*--hard\b",
     "`git reset --hard` is destructive and needs explicit human approval (AGENTS.md 7/15)."),
    (r"\bgit\s+push\b[^|;&]*(--force\b|--force-with-lease\b|\s-f\b)[^|;&]*\bmain\b",
     "Force-push to `main` is forbidden (AGENTS.md 7). `main` is the stable verified branch."),
    (r"\bgit\s+push\b[^|;&]*\bmain\b[^|;&]*(--force\b|--force-with-lease\b|\s-f\b)",
     "Force-push to `main` is forbidden (AGENTS.md 7). `main` is the stable verified branch."),
]


def main() -> None:
    try:
        payload = json.load(sys.stdin)
    except Exception:
        return
    command = (payload.get("tool_input") or {}).get("command") or ""
    for pattern, reason in RULES:
        if re.search(pattern, command, re.IGNORECASE):
            json.dump({
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "deny",
                    "permissionDecisionReason": reason,
                }
            }, sys.stdout)
            return


main()
