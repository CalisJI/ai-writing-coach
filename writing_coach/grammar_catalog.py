"""Language-neutral structural validation for grammar lesson catalogs."""
from __future__ import annotations
from collections.abc import Mapping, Sequence
from typing import Any

class GrammarCatalogInvalid(ValueError):
    pass

_BASE_REQUIRED=("id","order","level","category","title","objective_vi")
_RICH_REQUIRED=("kind","module","scope","prerequisites","contrasts","restrictions","common_traps","practice_blueprint","completion_policy","reference_basis","official_mapping","content_version")
_ALLOWED_KINDS={"lesson","review","checkpoint"}

def _validate_rich(lesson: Mapping[str, Any], lesson_id: str) -> None:
    for field in _RICH_REQUIRED:
        if field not in lesson:
            raise GrammarCatalogInvalid(f"Grammar lesson '{lesson_id}' is missing rich curriculum field '{field}'.")
    if lesson["kind"] not in _ALLOWED_KINDS:
        raise GrammarCatalogInvalid(f"Grammar lesson '{lesson_id}' kind must be lesson, review or checkpoint.")
    for field in ("scope","prerequisites","contrasts","restrictions","common_traps","reference_basis"):
        if not isinstance(lesson[field],list):
            raise GrammarCatalogInvalid(f"Grammar lesson '{lesson_id}' field '{field}' must be a list.")
    if lesson["kind"]=="lesson" and len(lesson["scope"])<5:
        raise GrammarCatalogInvalid(f"Grammar lesson '{lesson_id}' must define at least 5 syllabus scope points.")
    bp=lesson["practice_blueprint"]
    if not isinstance(bp,Mapping):
        raise GrammarCatalogInvalid(f"Grammar lesson '{lesson_id}' practice_blueprint must be a mapping.")
    for key in ("recognition","controlled","contrast","correction","transformation","production"):
        if not isinstance(bp.get(key),int) or isinstance(bp.get(key),bool) or bp.get(key,0)<0:
            raise GrammarCatalogInvalid(f"Grammar lesson '{lesson_id}' practice_blueprint '{key}' must be a non-negative integer.")
    if lesson["kind"]=="lesson" and bp["production"]<2:
        raise GrammarCatalogInvalid(f"Grammar lesson '{lesson_id}' must include at least two production tasks.")
    if lesson["official_mapping"] is not False:
        raise GrammarCatalogInvalid(f"Grammar lesson '{lesson_id}' must not claim an official one-to-one framework mapping.")

def validate_grammar_catalog(course: Sequence[Mapping[str, Any]], language_levels: Sequence[str], grammar_by_id: Mapping[str, Mapping[str, Any]]) -> None:
    if not isinstance(course,Sequence) or isinstance(course,(str,bytes)) or not course:
        raise GrammarCatalogInvalid("Grammar course must be a non-empty sequence.")
    allowed=frozenset(language_levels)
    ids=set(); orders=set(); by_id={}
    for position,lesson in enumerate(course,start=1):
        if not isinstance(lesson,Mapping):
            raise GrammarCatalogInvalid(f"Grammar lesson at position {position} must be a mapping.")
        for field in _BASE_REQUIRED:
            if field not in lesson:
                raise GrammarCatalogInvalid(f"Grammar lesson at position {position} is missing required field '{field}'.")
        lid=lesson["id"]
        if not isinstance(lid,str) or not lid.strip() or lid!=lid.strip():
            raise GrammarCatalogInvalid(f"Grammar lesson at position {position} must have a non-empty stable string id.")
        if lid in ids: raise GrammarCatalogInvalid(f"Grammar course has duplicate lesson id '{lid}'.")
        order=lesson["order"]
        if not isinstance(order,int) or isinstance(order,bool):
            raise GrammarCatalogInvalid(f"Grammar lesson '{lid}' order must be an integer.")
        if order in orders: raise GrammarCatalogInvalid(f"Grammar course has duplicate lesson order {order}.")
        if lesson["level"] not in allowed:
            raise GrammarCatalogInvalid(f"Grammar lesson '{lid}' level must belong to the supplied language levels.")
        for field in ("category","title","objective_vi"):
            if not isinstance(lesson[field],str) or not lesson[field].strip():
                raise GrammarCatalogInvalid(f"Grammar lesson '{lid}' field '{field}' must be a non-empty string.")
        # Legacy fixtures remain valid; production v2 catalogs are audited separately.
        if any(field in lesson for field in _RICH_REQUIRED):
            _validate_rich(lesson,lid)
        ids.add(lid); orders.add(order); by_id[lid]=lesson
    if sorted(orders)!=list(range(1,len(course)+1)):
        raise GrammarCatalogInvalid("Grammar course lesson orders must be contiguous beginning at 1.")
    if not isinstance(grammar_by_id,Mapping) or set(grammar_by_id)!=set(by_id):
        raise GrammarCatalogInvalid("Grammar catalog index keys must match the course lesson ids.")
    for lid,lesson in by_id.items():
        if grammar_by_id[lid]!=lesson:
            raise GrammarCatalogInvalid(f"Grammar catalog index entry for lesson id '{lid}' does not match the course lesson.")
