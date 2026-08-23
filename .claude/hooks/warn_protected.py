"""PostToolUse/Write|Edit: warn when an AGENTS.md sec.5 protected area was
edited. Advisory only -- the edit already happened. The point is that the
justification and the immediate verification do not get skipped."""
import json
import re
import sys

# (regex over the repo-relative posix path, label)
PROTECTED = [
    (r"^docs/visual-references/", "visual reference assets"),
    (r"^static/becoming/(app|theme|visual-alignment)\.css$", "shared BECOMING design system CSS"),
    (r"^static/becoming/(router|store|theme)\.js$", "shared BECOMING frontend infrastructure"),
    (r"^static/becoming/components/primitives\.js$", "shared layout primitives"),
    (r"^templates/becoming/index\.html$", "BECOMING shell template"),
    (r"^writing_coach/grammar_(catalog|knowledge|learning_model)\.py$",
     "R5 Grammar Knowledge System contracts / stable Concept IDs"),
    (r"^writing_coach/languages/[a-z]+/grammar_course\.py$", "R5 grammar course source of truth"),
    (r"^BECOMING_FRONTEND_VERSION$", "frontend version pin (currently 2.17.3)"),
    (r"^(VERSION|AGENTS\.md)$", "release / governance contract"),
    (r"^docs/project/", "governance documents (see /governance-update)"),
]


def main() -> None:
    try:
        payload = json.load(sys.stdin)
    except Exception:
        return
    tool_input = payload.get("tool_input") or {}
    response = payload.get("tool_response") or {}
    path = response.get("filePath") or tool_input.get("file_path") or ""
    norm = path.replace("\\", "/")
    # Reduce absolute Windows/POSIX paths to the repo-relative tail.
    # Works from any of the sibling worktrees (-v030, -claudecode, -codex).
    norm = re.sub(r"^.*/ai-writing-coach[^/]*/", "", norm)
    norm = norm.lstrip("./")

    for pattern, label in PROTECTED:
        if re.search(pattern, norm):
            message = (
                f"PROTECTED AREA edited: {norm} - {label} (AGENTS.md sec.5). "
                "State why this change was required, keep it minimal, and verify it "
                "immediately. Do not opportunistically refactor here."
            )
            json.dump({
                "systemMessage": message,
                "hookSpecificOutput": {
                    "hookEventName": "PostToolUse",
                    "additionalContext": message,
                },
            }, sys.stdout)
            return


main()
