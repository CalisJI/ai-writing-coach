from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class LanguageProfile:
    """Metadata contract shared by every language module."""

    code: str
    name: str
    native_name: str
    icon: str
    enabled: bool
    status: str
    levels: tuple[str, ...] = field(default_factory=tuple)
    api_namespace: str = ""
    db_namespace: str = ""
    capabilities: tuple[str, ...] = field(default_factory=tuple)

    def public_dict(self) -> dict[str, object]:
        return {
            "code": self.code,
            "name": self.name,
            "native_name": self.native_name,
            "icon": self.icon,
            "enabled": self.enabled,
            "status": self.status,
            "levels": list(self.levels),
            "api_namespace": self.api_namespace or self.code,
            "capabilities": list(self.capabilities),
        }
