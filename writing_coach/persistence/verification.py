from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import Engine

from writing_coach.persistence.importer import Discovery, source_counts, target_counts


@dataclass(frozen=True)
class VerificationResult:
    source: dict[str, int]
    target: dict[str, int]
    mismatches: dict[str, tuple[int, int]]

    @property
    def ok(self) -> bool:
        return not self.mismatches


def verify_shadow(engine: Engine, discovery: Discovery) -> VerificationResult:
    source = source_counts(discovery).as_dict()
    target = target_counts(engine).as_dict()

    # Target users can legitimately be >= source users because product.db may
    # contain a user key not present in auth.db/learning DBs. All other migrated
    # persistent domains should match exactly after an idempotent import.
    mismatches: dict[str, tuple[int, int]] = {}
    for key, expected in source.items():
        actual = target.get(key, 0)
        if key == "users":
            if actual < expected:
                mismatches[key] = (expected, actual)
        elif actual != expected:
            mismatches[key] = (expected, actual)
    return VerificationResult(source=source, target=target, mismatches=mismatches)
