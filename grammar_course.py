"""Backward-compatible import shim. New code should import the English language module."""
from writing_coach.languages.english.grammar_course import GRAMMAR_COURSE, GRAMMAR_BY_ID

__all__ = ["GRAMMAR_COURSE", "GRAMMAR_BY_ID"]
