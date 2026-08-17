# Orena Grammar Classification Resolution V2

Status: **CLASSIFIER V2 COMPLETE / CONTENT AUTHORING GATED BY EVIDENCE**

## Why this pass exists

The first curriculum map left 148/239 Chinese lessons unclassified. That is
too high to safely author concept-specific content. This V2 classifier uses
weighted evidence from repository curriculum/KB metadata and learns only
high-purity metadata clusters from high-confidence Chinese examples.

It explicitly excludes `learning_model` text from classification so generic
learner-facing filler cannot bootstrap its own family assignment.

## Results

- Total lessons: **508**
- English unclassified: **0**
- Chinese lessons: **239**
- Chinese direct-evidence resolved: **185**
- Chinese metadata-cluster resolved: **1**
- Chinese still unclassified: **53**
- Chinese unresolved clusters: **11**
- Authoring batches ready: **164**
- Authoring batches blocked: **6**

## Hard gates

- Generic mass fill remains forbidden.
- Unclassified lessons remain BLOCKED rather than receiving guessed content.
- Candidate missing families are review signals, not auto-added curriculum.
- Content authoring can proceed in large batches only for evidence-backed families.

## Chinese family coverage

| Family | Lessons |
|---|---:|
| adverbs_degree_frequency | 11 |
| aspect_guo | 2 |
| aspect_le | 3 |
| aspect_zhe | 3 |
| ba_construction | 5 |
| bei_passive | 4 |
| classifiers_measure_words | 2 |
| comparison_bi | 2 |
| comparison_change | 2 |
| comparison_yiyang | 1 |
| complex_clauses | 8 |
| copula_shi | 4 |
| core_word_order | 1 |
| de_modifier | 4 |
| degree_complements | 1 |
| demonstratives | 1 |
| directional_complements | 3 |
| discourse_connectivity | 3 |
| double_object | 1 |
| existential_you | 1 |
| focus_emphasis | 7 |
| location_zai | 1 |
| modal_verbs | 2 |
| negation_bu_mei | 6 |
| numbers_dates_quantities | 1 |
| pivotal_sentences | 1 |
| potential_complements | 1 |
| prepositions_coverbs | 13 |
| progressive_zai_zhengzai | 1 |
| pronouns | 1 |
| questions_ma_ne_wh | 4 |
| reduplication | 1 |
| register_pragmatics | 36 |
| result_complements | 1 |
| review_checkpoint | 43 |
| sentence_final_particles | 1 |
| separable_verbs | 1 |
| time_expressions | 1 |
| topic_comment | 2 |

## Unresolved cluster review

### ZH-U001

- Level: `HSK1`
- Category: `基础句型`
- Module: `基础句型`
- Lessons: **2**
- Sample titles: `Từ để hỏi giữ nguyên vị trí; 和 nối danh từ`

### ZH-U002

- Level: `HSK2`
- Category: `体与补语`
- Module: `体与补语`
- Lessons: **3**
- Sample titles: `得: bổ ngữ mức độ; Bổ ngữ thời lượng: introduction; Bổ ngữ động lượng: introduction`

### ZH-U003

- Level: `HSK2`
- Category: `复句与副词`
- Module: `复句与副词`
- Lessons: **3**
- Sample titles: `只要...就...; 只有...才...; 一边...一边...`

### ZH-U004

- Level: `HSK3`
- Category: `复句与话题`
- Module: `复句与话题`
- Lessons: **2**
- Sample titles: `由于...因此...; 是...的 nhấn mạnh`

### ZH-U005

- Level: `HSK3`
- Category: `把被与补语`
- Module: `把被与补语`
- Lessons: **4**
- Sample titles: `把 và 被 đối chiếu; Bổ ngữ thời lượng; Bổ ngữ động lượng; 趋向补语 nghĩa mở rộng`

### ZH-U006

- Level: `HSK4`
- Category: `复杂句式`
- Module: `复杂句式`
- Lessons: **7**
- Sample titles: `除非...否则...; 不管/无论...都...; 哪怕/即便...也...; 之所以...是因为...; 按照/根据...`

### ZH-U007

- Level: `HSK4`
- Category: `衔接与书面表达`
- Module: `衔接与书面表达`
- Lessons: **3**
- Sample titles: `然而/不过/可是; 宁可...也不...; 来得及/来不及`

### ZH-U008

- Level: `HSK5`
- Category: `高级复句`
- Module: `高级复句`
- Lessons: **6**
- Sample titles: `不是...而是...; 并非/并不是; 未必/不见得; 难免/免不了; 务必/切勿/不得`

### ZH-U009

- Level: `HSK6`
- Category: `把被使令`
- Module: `把被使令`
- Lessons: **5**
- Sample titles: `由 + agent/source; 使/令/让/促使; 导致/致使; 以致/以至于; 以便/以免/以期`

### ZH-U010

- Level: `HSK6`
- Category: `范围与语气`
- Module: `范围与语气`
- Lessons: **3**
- Sample titles: `了/过/着 tương tác nâng cao; 恐怕/大概/显然/据说; 并不/未必/不都/都不`

### ZH-U011

- Level: `HSK6`
- Category: `高级复句与书面语`
- Module: `高级复句与书面语`
- Lessons: **15**
- Sample titles: `只要/只有/除非/倘若/假如/一旦; 所字结构 nâng cao; 者 patterns; 之 patterns; 就...而言 / 从...来看`

# DONE

- Chinese classifier expanded to language-specific grammar mechanisms.
- Weighted evidence scoring.
- High-purity metadata-cluster learning.
- V2 authoring manifest and batches.
- One-shot unresolved review pack.

# IN PROGRESS

- Resolve any remaining Chinese review clusters.

# PENDING

- Concept-specific batch authoring.
- Linguistic/content validation.
- Full curriculum migration.

# BLOCKED

- Any lesson still `unclassified` may not receive generated filler.
