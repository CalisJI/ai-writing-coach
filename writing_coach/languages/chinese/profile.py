from writing_coach.languages.base import LanguageProfile

# Deliberately disabled in v0.9.0.
# Enable only after Chinese evaluator/content/tests are complete.
PROFILE = LanguageProfile(
    code="zh",
    name="Chinese",
    native_name="中文",
    icon="🇨🇳",
    enabled=False,
    status="planned",
    levels=(),
    api_namespace="zh",
    db_namespace="zh",
    capabilities=(),
)
