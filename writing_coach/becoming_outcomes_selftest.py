import json
import sqlite3

from writing_coach.becoming_outcomes import derive_practice_outcome
from writing_coach.persistence.specialized_repository import SQLiteSpecializedLearningRepository


def main() -> None:
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    conn.execute(
        """
        CREATE TABLE essays(
          id INTEGER PRIMARY KEY,
          series_id INTEGER,
          revision_no INTEGER,
          created_at TEXT,
          overall REAL,
          errors_json TEXT,
          strength_evidence_json TEXT,
          module_data_json TEXT
        )
        """
    )

    context = {
        "practice": {
            "intent": "repair",
            "focus_category": "article",
            "focus_label": "Article",
            "focus_family": "grammar",
        }
    }

    conn.execute(
        "INSERT INTO essays VALUES(1,1,1,?,?,?,?,?)",
        (
            "2026-08-10T08:00:00+07:00",
            60.0,
            json.dumps([
                {"category": "article", "fragment": "a orange"},
                {"category": "article_usage", "fragment": "a university"},
            ]),
            "[]",
            json.dumps(context),
        ),
    )
    conn.execute(
        "INSERT INTO essays VALUES(2,1,2,?,?,?,?,?)",
        (
            "2026-08-10T08:20:00+07:00",
            66.0,
            json.dumps([
                {"category": "article", "fragment": "a orange"},
            ]),
            "[]",
            json.dumps(context),
        ),
    )
    conn.execute(
        "INSERT INTO essays VALUES(3,1,3,?,?,?,?,?)",
        (
            "2026-08-10T08:40:00+07:00",
            70.0,
            "[]",
            json.dumps([
                {
                    "category": "grammar",
                    "fragment": "an orange",
                    "explanation_vi": "Dùng mạo từ đúng trong ngữ cảnh này.",
                }
            ]),
            json.dumps(context),
        ),
    )
    conn.commit()

    repo = SQLiteSpecializedLearningRepository(lambda: conn)
    rows = repo.memory_essay_rows()
    row2 = next(r for r in rows if r["id"] == 2)
    out2 = derive_practice_outcome(rows, row2)
    assert out2 and out2["status"] == "improved"
    assert out2["previous_issue_count"] == 2
    assert out2["issue_count"] == 1

    rows = repo.memory_essay_rows()
    row3 = next(r for r in rows if r["id"] == 3)
    out3 = derive_practice_outcome(rows, row3)
    assert out3 and out3["status"] == "improved"
    assert out3["issue_count"] == 0
    assert out3["strength_count"] == 1

    transfer_context = {
        "practice": {
            "intent": "transfer",
            "focus_category": "coherence",
            "focus_label": "Coherence",
            "focus_family": "coherence",
        }
    }
    conn.execute(
        "INSERT INTO essays VALUES(4,4,1,?,?,?,?,?)",
        (
            "2026-08-10T09:00:00+07:00",
            74.0,
            "[]",
            json.dumps([
                {
                    "category": "coherence",
                    "fragment": "My main reason is simple.",
                    "explanation_vi": "Ý chính rõ.",
                }
            ]),
            json.dumps(transfer_context),
        ),
    )
    conn.commit()
    rows = repo.memory_essay_rows()
    row4 = next(r for r in rows if r["id"] == 4)
    out4 = derive_practice_outcome(rows, row4)
    assert out4 and out4["status"] == "transferred"

    print("BECOMING Phase 6 practice-outcome self-test OK")


if __name__ == "__main__":
    main()
