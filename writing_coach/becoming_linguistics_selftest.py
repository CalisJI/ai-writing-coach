from __future__ import annotations

import sqlite3

from writing_coach.becoming_linguistics import (
    configure_becoming_linguistics,
    linguistic_annotations_for_essay,
)


class Result:
    def __init__(self, data):
        self.data = data


def fake_generate(**kwargs):
    text = "I write clear sentences."
    return Result(
        {
            "annotations": [
                {"fragment": "I", "pos": "pronoun"},
                {"fragment": "write", "pos": "verb"},
                {"fragment": "clear", "pos": "adjective"},
                {"fragment": "sentences", "pos": "noun"},
                # fragment not present in the source must be ignored
                {"fragment": "wrong", "pos": "noun"},
            ]
        }
    )


def main() -> None:
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    conn.execute(
        """
        CREATE TABLE essays(
            id INTEGER PRIMARY KEY,
            text TEXT NOT NULL,
            language_code TEXT NOT NULL DEFAULT 'en',
            module_data_json TEXT NOT NULL DEFAULT '{}'
        )
        """
    )
    conn.execute(
        """
        INSERT INTO essays(id,text,language_code,module_data_json)
        VALUES(1,'I write clear sentences.','en','{}')
        """
    )
    conn.commit()

    calls = {"count": 0}

    def generate(**kwargs):
        calls["count"] += 1
        return fake_generate(**kwargs)

    configure_becoming_linguistics(lambda: conn, generate)

    first = linguistic_annotations_for_essay(1)
    assert first["found"] is True
    assert first["cached"] is False
    assert len(first["annotations"]) == 4
    assert first["annotations"][1]["fragment"] == "write"
    assert first["claim"] == "parts_of_speech_learning_aid"

    second = linguistic_annotations_for_essay(1)
    assert second["cached"] is True
    assert calls["count"] == 1

    missing = linguistic_annotations_for_essay(999)
    assert missing["found"] is False

    print("BECOMING v2.10 linguistic annotations self-test OK")


if __name__ == "__main__":
    main()
