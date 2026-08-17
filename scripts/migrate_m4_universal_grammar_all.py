from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
EN_PATH = ROOT / "writing_coach/languages/english/grammar_knowledge.json"
ZH_PATH = ROOT / "writing_coach/languages/chinese/grammar_knowledge.json"

FLOW = [
    "notice", "understand", "pattern", "context",
    "compare", "apply", "recall", "transfer",
]

REPRESENTATIVE_CURATED = {
    "a1-be-am-is-are",
    "a2-present-perfect-vs-past-simple",
    "b1-passive-voice-present-and-past",
}


def L(en: str, vi: str, zh: str) -> dict[str, str]:
    return {"en": en, "vi": vi, "zh": zh}


def clean(value: Any) -> str:
    return str(value or "").strip()


def first_string(value: Any) -> str:
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, list):
        for item in value:
            if isinstance(item, str) and item.strip():
                return item.strip()
            if isinstance(item, dict):
                for key in (
                    "text", "target", "en", "zh", "vi", "note_vi",
                    "incorrect", "why", "correct",
                ):
                    text = clean(item.get(key))
                    if text:
                        return text
    return ""


def first_example(entry: dict[str, Any], language: str) -> dict[str, str]:
    lesson = entry.get("lesson") if isinstance(entry.get("lesson"), dict) else {}
    examples = lesson.get("examples") if isinstance(lesson.get("examples"), list) else []
    for raw in examples:
        if isinstance(raw, str) and raw.strip():
            return {"target": raw.strip(), "meaning_vi": "", "reading_aid": ""}
        if not isinstance(raw, dict):
            continue
        keys = (
            ("target", "zh", "text", "en")
            if language == "zh"
            else ("target", "en", "text", "zh")
        )
        target = next((clean(raw.get(key)) for key in keys if clean(raw.get(key))), "")
        if target:
            return {
                "target": target,
                "meaning_vi": clean(raw.get("vi")) or clean(raw.get("meaning_vi")),
                "reading_aid": (
                    clean(raw.get("reading_aid"))
                    or clean(raw.get("transliteration"))
                    or clean(raw.get("pinyin"))
                ),
            }
    title = clean(entry.get("title"))
    return {
        "target": title or ("语法例句" if language == "zh" else "Grammar example"),
        "meaning_vi": "",
        "reading_aid": "",
    }


def second_target(entry: dict[str, Any], language: str, first: str) -> str:
    lesson = entry.get("lesson") if isinstance(entry.get("lesson"), dict) else {}
    examples = lesson.get("examples") if isinstance(lesson.get("examples"), list) else []
    for raw in examples:
        if isinstance(raw, str):
            target = raw.strip()
        elif isinstance(raw, dict):
            keys = (
                ("target", "zh", "text", "en")
                if language == "zh"
                else ("target", "en", "text", "zh")
            )
            target = next((clean(raw.get(key)) for key in keys if clean(raw.get(key))), "")
        else:
            target = ""
        if target and target != first:
            return target
    return "语境" if language == "zh" else "context"


def source_vi(entry: dict[str, Any], key: str, fallback: str) -> str:
    quick = entry.get("quick_reference") if isinstance(entry.get("quick_reference"), dict) else {}
    lesson = entry.get("lesson") if isinstance(entry.get("lesson"), dict) else {}
    if key == "summary":
        return clean(quick.get("summary_vi")) or clean(lesson.get("explanation_vi")) or fallback
    if key == "restriction":
        return (
            first_string(quick.get("restrictions"))
            or first_string(lesson.get("exceptions"))
            or fallback
        )
    if key == "contrast":
        return (
            first_string(quick.get("contrasts"))
            or first_string(lesson.get("contrasts"))
            or fallback
        )
    if key == "trap":
        return (
            first_string(quick.get("common_traps"))
            or first_string(lesson.get("mistakes"))
            or fallback
        )
    return fallback


def build_source_adapted_model(
    entry: dict[str, Any],
    language: str,
) -> dict[str, Any]:
    grammar_id = clean(entry.get("id"))
    example = first_example(entry, language)
    example2 = second_target(entry, language, example["target"])

    meaning_vi = source_vi(
        entry,
        "summary",
        "Hiểu ý nghĩa, cách dùng và giới hạn của điểm ngữ pháp này trong ngữ cảnh.",
    )
    contrast_vi = source_vi(
        entry,
        "contrast",
        "So sánh với cấu trúc gần nghĩa trước khi chọn cách diễn đạt.",
    )
    restriction_vi = source_vi(
        entry,
        "restriction",
        "Không dùng máy móc; luôn kiểm tra ý nghĩa và ngữ cảnh của câu.",
    )
    trap_vi = source_vi(
        entry,
        "trap",
        "Lỗi thường gặp là chọn cấu trúc theo hình thức mà bỏ qua ý nghĩa và ngữ cảnh.",
    )

    policy: dict[str, Any] = {
        "target_language": language,
        "explanation_languages": ["en", "vi", "zh"],
        "translation_languages": ["en", "vi", "zh"],
    }
    if language == "zh" and example["reading_aid"]:
        policy["reading_aid"] = {
            "capability": "transliteration",
            "system": "pinyin",
            "visibility": "toggle",
        }

    capabilities = [
        "context-scene",
        "semantic-role",
        "contrast",
        "common-mistake",
        "personal-practice",
        "active-recall",
        "skill-transfer",
    ]
    if language == "zh":
        capabilities.insert(0, "word-order")
        if example["reading_aid"]:
            capabilities.append("reading-aid")
    else:
        capabilities.insert(0, "formula")

    model: dict[str, Any] = {
        "schema_version": 2,
        "flow": FLOW,
        "language_policy": policy,
        "capabilities": capabilities,
        "hook": {
            "eyebrow": L("NOTICE THE IDEA", "NHẬN RA Ý", "先理解意思"),
            "prompt": L(
                "Start with the meaning you want to express. Then notice how this grammar concept shapes the sentence.",
                "Bắt đầu từ ý bạn muốn diễn đạt. Sau đó quan sát điểm ngữ pháp này tổ chức câu như thế nào.",
                "先确定你想表达的意思，再观察这个语法点怎样组织句子。",
            ),
        },
        "meaning": {
            "summary": L(
                "This grammar concept connects meaning, sentence structure and context. Learn the relationship before memorizing the form.",
                meaning_vi,
                "这个语法点把意义、句子结构和语境连接起来。先理解关系，再记形式。",
            ),
            "mental_model": L(
                "Meaning → pattern → context. The form is useful only when it matches the speaker's intended meaning.",
                "Ý nghĩa → mẫu câu → ngữ cảnh. Công thức chỉ hữu ích khi khớp với điều người nói muốn diễn đạt.",
                "意义 → 结构 → 语境。形式只有在符合说话者意图时才有用。",
            ),
            "use_when": [
                L(
                    "Use it when the intended meaning and sentence relationship match this concept.",
                    "Dùng khi ý nghĩa và quan hệ trong câu phù hợp với điểm ngữ pháp này.",
                    "当你要表达的意义和句子关系符合这个语法点时使用。",
                ),
                L(
                    "Check nearby forms before choosing it automatically.",
                    contrast_vi,
                    "不要机械套用；先和相近结构进行比较。",
                ),
            ],
        },
        "blocks": [],
        "completion": {"required_stages": ["apply", "recall", "transfer"]},
    }

    if language == "zh":
        segments: list[dict[str, Any]] = [
            {
                "text": example["target"],
                "role": "comment",
                "label": L("Target example", "Ví dụ đích", "目标例句"),
                "meaning": L(
                    "Target-language example of the grammar concept.",
                    example["meaning_vi"] or "Ví dụ ngôn ngữ đích của điểm ngữ pháp.",
                    "这个语法点的目标语言例句。",
                ),
            },
            {
                "text": example2,
                "role": "marker",
                "label": L("Pattern cue", "Dấu hiệu cấu trúc", "结构提示"),
                "meaning": L(
                    "Notice the order, marker or relationship that carries the meaning.",
                    "Chú ý trật tự, dấu hiệu hoặc quan hệ tạo nên ý nghĩa.",
                    "注意承载意义的语序、标记或句法关系。",
                ),
            },
        ]
        if example["reading_aid"]:
            segments[0]["reading_aid"] = example["reading_aid"]
        pattern_block = {
            "id": f"{grammar_id}-universal-pattern",
            "type": "word_order",
            "stage": "pattern",
            "title": L(
                "See the sentence relationship",
                "Nhìn quan hệ trong câu",
                "看清句子关系",
            ),
            "instruction": L(
                "Read the target example as a meaning-and-order pattern, not as an English tense formula.",
                "Đọc ví dụ như một mẫu quan hệ ý nghĩa và trật tự, không ép theo công thức thì của tiếng Anh.",
                "把例句看成“意义 + 语序/标记”的关系，不套用英语时态公式。",
            ),
            "payload": {"segments": segments},
        }
    else:
        pattern_block = {
            "id": f"{grammar_id}-universal-pattern",
            "type": "formula",
            "stage": "pattern",
            "title": L(
                "See the core pattern",
                "Nhìn ra mẫu cốt lõi",
                "看清核心结构",
            ),
            "instruction": L(
                "Use the example to connect form with meaning. Do not memorize the labels without context.",
                "Dùng ví dụ để nối form với meaning. Không học thuộc nhãn khi tách khỏi ngữ cảnh.",
                "通过例句把形式和意义连接起来，不要脱离语境死记标签。",
            ),
            "payload": {
                "parts": [
                    {
                        "text": example["target"],
                        "role": "verb",
                        "label": L("Target pattern", "Mẫu đích", "目标结构"),
                    },
                    {
                        "text": example2,
                        "role": "complement",
                        "label": L(
                            "Context / nearby use",
                            "Ngữ cảnh / cách dùng gần",
                            "语境 / 相近用法",
                        ),
                    },
                ]
            },
        }

    scene_line: dict[str, Any] = {
        "text": example["target"],
        "meaning": L(
            "Read it for the intended meaning first; then notice the grammar choice.",
            example["meaning_vi"]
            or "Đọc để hiểu ý trước, sau đó mới quan sát lựa chọn ngữ pháp.",
            "先理解句子要表达的意思，再观察语法选择。",
        ),
    }
    if example["reading_aid"]:
        scene_line["reading_aid"] = example["reading_aid"]

    model["blocks"] = [
        pattern_block,
        {
            "id": f"{grammar_id}-universal-context",
            "type": "scene",
            "stage": "context",
            "title": L("See it in context", "Nhìn trong ngữ cảnh", "放进语境理解"),
            "instruction": L(
                "Context decides whether a grammar form is natural and useful.",
                "Ngữ cảnh quyết định cấu trúc có tự nhiên và đúng mục đích hay không.",
                "语境决定某个语法形式是否自然、是否符合表达目的。",
            ),
            "payload": {
                "setup": L(
                    "Imagine this as a real sentence in a conversation, message, article or task.",
                    "Hãy xem đây là một câu thật trong hội thoại, tin nhắn, bài đọc hoặc nhiệm vụ.",
                    "把它看成真实对话、消息、文章或任务中的一句话。",
                ),
                "lines": [scene_line],
            },
        },
        {
            "id": f"{grammar_id}-universal-contrast",
            "type": "contrast",
            "stage": "compare",
            "title": L(
                "Don't confuse nearby choices",
                "Đừng nhầm các lựa chọn gần nhau",
                "别和相近结构混淆",
            ),
            "payload": {
                "items": [
                    {
                        "label": L("THIS CONCEPT", "CẤU TRÚC NÀY", "本语法点"),
                        "text": example["target"],
                        "note": L(
                            "Choose it when its meaning and sentence relationship match the context.",
                            "Chọn khi ý nghĩa và quan hệ trong câu khớp với ngữ cảnh.",
                            "当它的意义和句子关系符合语境时使用。",
                        ),
                    },
                    {
                        "label": L("NEARBY CHOICE", "LỰA CHỌN GẦN", "相近选择"),
                        "text": L(
                            "Compare the nearby form",
                            "So sánh cấu trúc gần",
                            "比较相近结构",
                        ),
                        "note": L(
                            "Ask what meaning, time, viewpoint, order or discourse focus changes.",
                            contrast_vi,
                            "比较意义、时间视角、语序、标记或信息焦点发生了什么变化。",
                        ),
                    },
                ]
            },
        },
        {
            "id": f"{grammar_id}-universal-mistake",
            "type": "common_mistake",
            "stage": "compare",
            "title": L(
                "Common decision error",
                "Lỗi lựa chọn thường gặp",
                "常见选择错误",
            ),
            "payload": {
                "incorrect": L(
                    "Choose the form only because it looks familiar.",
                    trap_vi,
                    "只因为形式熟悉就直接套用。",
                ),
                "why": L(
                    "Grammar encodes meaning and relationships. A familiar form can still be wrong when the context or intended meaning changes.",
                    "Ngữ pháp mã hóa ý nghĩa và quan hệ. Một form quen thuộc vẫn có thể sai nếu ngữ cảnh hoặc ý định diễn đạt đã đổi.",
                    "语法表达意义和关系。即使形式很熟悉，只要语境或表达意图改变，也可能用错。",
                ),
                "correct": L(
                    "Choose the form after checking meaning, sentence relationship and context.",
                    "Chọn cấu trúc sau khi kiểm tra ý nghĩa, quan hệ trong câu và ngữ cảnh.",
                    "先检查意义、句子关系和语境，再选择结构。",
                ),
                "context": L(
                    "Use the lesson examples and contrast block to make the decision.",
                    "Dùng ví dụ và phần phân biệt của bài để ra quyết định.",
                    "结合本课例句和对比部分来做判断。",
                ),
            },
        },
        {
            "id": f"{grammar_id}-universal-exception",
            "type": "exception",
            "stage": "compare",
            "title": L("Know the boundary", "Biết giới hạn sử dụng", "知道使用边界"),
            "payload": {
                "rule": L(
                    "Use the concept when its normal meaning and structural conditions are present.",
                    "Dùng khi ý nghĩa và điều kiện cấu trúc thông thường của điểm ngữ pháp xuất hiện.",
                    "当这个语法点通常的意义和结构条件成立时使用。",
                ),
                "exception": L(
                    "Do not force it into every sentence that looks similar.",
                    restriction_vi,
                    "不要把它强行套进所有表面相似的句子。",
                ),
                "why": L(
                    "Register, discourse focus, time viewpoint, word order or lexical choice can change which grammar form is natural.",
                    "Sắc thái, trọng tâm thông tin, góc nhìn thời gian, trật tự từ hoặc lựa chọn từ vựng có thể làm thay đổi cấu trúc tự nhiên.",
                    "语体、信息焦点、时间视角、语序或词汇选择都会影响哪种结构更自然。",
                ),
                "context": L(
                    "When unsure, compare the intended meaning with the nearest alternative.",
                    "Khi chưa chắc, hãy so ý định diễn đạt với lựa chọn gần nhất.",
                    "不确定时，把表达意图和最接近的替代结构进行比较。",
                ),
            },
        },
        {
            "id": f"{grammar_id}-universal-apply",
            "type": "micro_practice",
            "stage": "apply",
            "title": L(
                "Make one real choice",
                "Tự đưa ra một lựa chọn thật",
                "做一次真实选择",
            ),
            "payload": {
                "interaction": "write",
                "prompt": L(
                    "Write one original target-language sentence that uses this grammar concept naturally. Add a short reason for your choice.",
                    "Viết một câu nguyên bản bằng ngôn ngữ đích dùng điểm ngữ pháp này tự nhiên. Ghi ngắn lý do bạn chọn cấu trúc đó.",
                    "用目标语言写一个自然使用本语法点的原创句子，并简短说明为什么这样选。",
                ),
                "placeholder": L(
                    "Sentence + why this grammar choice fits…",
                    "Câu của bạn + vì sao lựa chọn này phù hợp…",
                    "句子 + 为什么这个语法选择合适……",
                ),
                "explanation": L(
                    "A correct answer must match both form and intended meaning.",
                    "Câu tốt phải khớp cả form lẫn ý nghĩa muốn diễn đạt.",
                    "好的答案既要形式正确，也要符合要表达的意义。",
                ),
            },
        },
        {
            "id": f"{grammar_id}-universal-personal",
            "type": "personal_practice",
            "stage": "apply",
            "title": L(
                "Connect it to your life",
                "Liên hệ với chính bạn",
                "联系自己的生活",
            ),
            "payload": {
                "prompt": L(
                    "Create another example about your own day, study, work, plans or experience.",
                    "Tạo thêm một ví dụ thật về ngày của bạn, việc học, công việc, kế hoạch hoặc trải nghiệm của bạn.",
                    "再写一个和你自己的日常、学习、工作、计划或经历有关的例子。",
                ),
                "placeholder": L(
                    "My own example…",
                    "Ví dụ thật của tôi…",
                    "我的真实例子……",
                ),
            },
        },
        {
            "id": f"{grammar_id}-universal-recall",
            "type": "recall",
            "stage": "recall",
            "title": L(
                "Recall without copying",
                "Gợi nhớ không nhìn lại",
                "不照抄，主动回忆",
            ),
            "payload": {
                "prompt": L(
                    "Without looking back, explain the meaning cue that tells you to use this grammar concept and give one example.",
                    "Không nhìn lại bài: hãy nói dấu hiệu về ý nghĩa khiến bạn chọn điểm ngữ pháp này và tự cho một ví dụ.",
                    "不看上文：说出什么“意义提示”会让你选择这个语法点，并自己举一个例子。",
                ),
                "answer": L(
                    "Meaning first; then verify the pattern and context.",
                    "Ý nghĩa trước; sau đó kiểm tra pattern và ngữ cảnh.",
                    "先看意义，再确认结构和语境。",
                ),
            },
        },
        {
            "id": f"{grammar_id}-universal-memory",
            "type": "memory_hook",
            "stage": "recall",
            "title": L("Memory hook", "Móc ghi nhớ", "记忆钩子"),
            "payload": {
                "cue": L(
                    "MEANING → PATTERN → CONTEXT",
                    "Ý NGHĨA → MẪU → NGỮ CẢNH",
                    "意义 → 结构 → 语境",
                ),
                "remember": L(
                    "Do not memorize grammar as a disconnected formula. Remember what meaning the pattern creates in context.",
                    "Đừng nhớ ngữ pháp như công thức rời rạc. Hãy nhớ mẫu này tạo ra ý nghĩa gì trong ngữ cảnh.",
                    "不要把语法记成孤立公式；要记住这个结构在语境中表达什么意义。",
                ),
            },
        },
        {
            "id": f"{grammar_id}-universal-transfer",
            "type": "skill_transfer",
            "stage": "transfer",
            "title": L(
                "Transfer it across skills",
                "Chuyển sang các kỹ năng",
                "迁移到各项技能",
            ),
            "payload": {
                "skills": {
                    "writing": L(
                        "Use the concept once in a short message or paragraph, then check whether it expresses the intended meaning.",
                        "Dùng cấu trúc một lần trong tin nhắn hoặc đoạn ngắn, rồi kiểm tra xem nó có đúng ý bạn muốn nói không.",
                        "在短消息或段落中使用一次，并检查它是否准确表达了你的意思。",
                    ),
                    "speaking": L(
                        "Say one personal sentence aloud with the concept, then say a nearby alternative and notice the meaning change.",
                        "Nói thành tiếng một câu thật của bạn, rồi thử một lựa chọn gần và nhận ra ý nghĩa thay đổi thế nào.",
                        "大声说一个真实句子，再换成相近结构，感受意义发生了什么变化。",
                    ),
                    "reading": L(
                        "When you see the concept in a text, identify the meaning, relationship and context that motivated it.",
                        "Khi gặp cấu trúc trong bài đọc, xác định ý nghĩa, quan hệ và ngữ cảnh khiến người viết chọn nó.",
                        "阅读时遇到这个结构，要找出作者为什么在这个意义和语境下选择它。",
                    ),
                    "listening": L(
                        "When you hear the concept, listen for the surrounding words and situation that make the grammar choice meaningful.",
                        "Khi nghe thấy cấu trúc, chú ý từ xung quanh và tình huống khiến lựa chọn ngữ pháp đó có ý nghĩa.",
                        "听到这个结构时，注意周围词语和情境怎样支持这个语法选择。",
                    ),
                }
            },
        },
    ]

    return model


def detect_style(data: Any, original: str) -> bool:
    for ensure_ascii in (False, True):
        if json.dumps(data, ensure_ascii=ensure_ascii, indent=2) + "\n" == original:
            return ensure_ascii
    return False


def migrate_file(path: Path, language: str, *, write: bool) -> tuple[int, int]:
    original = path.read_text(encoding="utf-8")
    data = json.loads(original)
    ensure_ascii = detect_style(data, original)
    migrated = 0
    preserved = 0

    for entry in data:
        grammar_id = clean(entry.get("id"))
        source = entry.setdefault("source", {})
        source["runtime_ai"] = False

        if grammar_id in REPRESENTATIVE_CURATED and entry.get("learning_model"):
            source["universal_model_status"] = "representative-curated-v1"
            preserved += 1
            continue

        entry["learning_model"] = build_source_adapted_model(entry, language)
        source["universal_model_status"] = "source-adapted-v1"
        migrated += 1

    if write:
        path.write_text(
            json.dumps(data, ensure_ascii=ensure_ascii, indent=2) + "\n",
            encoding="utf-8",
            newline="\n",
        )
    return migrated, preserved


def verify(path: Path, language: str) -> tuple[int, int, int]:
    data = json.loads(path.read_text(encoding="utf-8"))
    schema2 = 0
    source_adapted = 0

    for entry in data:
        model = entry.get("learning_model")
        if isinstance(model, dict) and model.get("schema_version") == 2:
            schema2 += 1
        if entry.get("source", {}).get("universal_model_status") == "source-adapted-v1":
            source_adapted += 1
        policy = model.get("language_policy") if isinstance(model, dict) else None
        if not isinstance(policy, dict) or policy.get("target_language") != language:
            raise SystemExit(f"{entry.get('id')}: target-language policy mismatch.")
        if entry.get("source", {}).get("runtime_ai") is not False:
            raise SystemExit(f"{entry.get('id')}: runtime_ai must remain false.")

    return len(data), schema2, source_adapted


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--write", action="store_true")
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()

    if args.write:
        raise SystemExit(
            "This structural migration is superseded by R5 concept-specific authoring; "
            "--write is disabled to protect current grammar content."
        )
    en_total, en_schema2, en_source = verify(EN_PATH, "en")
    zh_total, zh_schema2, zh_source = verify(ZH_PATH, "zh")

    if en_total != 269 or zh_total != 239:
        raise SystemExit(
            f"Unexpected coverage EN={en_total}, ZH={zh_total}; expected 269/239."
        )
    if en_schema2 != en_total or zh_schema2 != zh_total:
        raise SystemExit("Universal model coverage is not 100%.")
    if en_total + zh_total != 508:
        raise SystemExit("Universal Grammar total must remain 508.")

    print("M4_UNIVERSAL_GRAMMAR_FULL_MIGRATION=PASS")
    print(f"EN_MODELS={en_schema2}/{en_total}")
    print(f"ZH_MODELS={zh_schema2}/{zh_total}")
    print(f"TOTAL_MODELS={en_schema2 + zh_schema2}/508")
    print(f"EN_SOURCE_ADAPTED={en_source}")
    print(f"ZH_SOURCE_ADAPTED={zh_source}")
    print("RUNTIME_AI=0")


if __name__ == "__main__":
    main()
