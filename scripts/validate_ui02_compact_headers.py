from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
CSS = ROOT / "static" / "becoming" / "visual-alignment.css"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(message)


css = CSS.read_text(encoding="utf-8")
ui02 = css.split("/* UI-02: learner pages lead with orientation and the next learning action. */", 1)[-1]
require(ui02 != css, "UI-02 compact-header section missing")
home_title_blocks = re.findall(
    r"\.home-editorial-copy \.editorial-title\s*\{([^}]*)\}", ui02
)
home_title_sizes = []
for block in home_title_blocks:
    match = re.search(r"font-size\s*:\s*([^;]+)", block)
    if match:
        home_title_sizes.append(match.group(1))

require(
    home_title_sizes == ["clamp(36px,4.2vw,52px)", "clamp(34px,10vw,46px)"],
    f"unexpected Home title breakpoint sizes: {home_title_sizes}",
)
for stale in ("clamp(54px,6vw,76px)", "clamp(46px,13vw,62px)", "line-height:.9"):
    require(stale not in ui02, f"stale Home title declaration remains: {stale}")
for required in (
    ".home-editorial-copy .editorial-title.cjk",
    "font-size:clamp(34px,4vw,46px);",
    "font-size:clamp(34px,9vw,44px);",
):
    require(required in css, f"missing CJK compact-header contract: {required}")

print("UI-02 compact-header cascade contract OK")
