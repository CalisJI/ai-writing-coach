# ORENA — GRAMMAR LESSON DESIGN SYSTEM
## Canonical Pedagogical + Visual Principles for English and Chinese

**Status:** Product design contract  
**Purpose:** Ensure every Grammar lesson in Orena is designed as a complete, visual, teachable lesson rather than a text article or a generic card layout.

---

# 0. CORE IDEA

A Grammar lesson is **not**:

- a title;
- a paragraph of explanation;
- a few examples;
- a quiz;
- some cards arranged nicely.

A Grammar lesson is:

> **A visual teaching model that helps the learner notice, understand, compare, apply, recall, and transfer one grammar concept.**

The visual reference is the desired *teaching style*:

- compact functional title;
- one dominant concept model;
- clear visual Pattern/Formula;
- context-specific When to use;
- meaningful examples;
- explicit Compare;
- Common mistake with Wrong → Correct;
- one immediately actionable practice;
- visible learning path/progress;
- calm product-grade composition.

The lesson must feel like a teacher deliberately designed it for **that grammar point**.

---

# 1. NON-NEGOTIABLE PRINCIPLE

## 1.1 Content architecture comes before layout

AI must never start by asking:

> “How should I arrange these cards?”

It must first answer:

1. What does the learner need to understand?
2. What is the concept's core meaning?
3. What pattern/form expresses it?
4. What visual representation best explains it?
5. What similar structure is it commonly confused with?
6. What mistake does a real learner make?
7. What practice best verifies understanding?
8. How will the learner use this concept in real language?

Only after those questions are answered should the renderer choose components.

---

# 2. CANONICAL LEARNING FLOW

Every concept should map to the following learning sequence where applicable:

```text
NOTICE
  ↓
UNDERSTAND
  ↓
PATTERN
  ↓
CONTEXT
  ↓
COMPARE
  ↓
APPLY
  ↓
RECALL
  ↓
TRANSFER
```

Not every step has to be a separate visible card.

The UI may combine steps when appropriate.

But the lesson model must support all eight.

---

# 3. THE REQUIRED LEARNER QUESTIONS

A complete lesson should allow the learner to answer:

### Meaning
> What does this grammar express?

### Form
> How is it built?

### Use
> When do I use it?

### Boundary
> When should I NOT use it?

### Contrast
> How is it different from a similar structure?

### Recognition
> How do I notice it in a sentence?

### Error awareness
> What mistake am I likely to make?

### Production
> Can I build my own sentence correctly?

### Transfer
> Can I use it in Writing/Speaking and recognize it in Reading/Listening?

If the lesson cannot answer these, it is incomplete even if the page looks polished.

---

# 4. VISUAL HIERARCHY CONTRACT

The reference lesson uses a clear hierarchy.

## Level 1 — Concept identity

Compact:

```text
LEVEL / UNIT
Grammar Concept Title
One-sentence meaning
```

No giant marketing slogan.

Example:

```text
INTERMEDIATE
Past Perfect Tense
Talk about an action completed before another past action.
```

---

## Level 2 — Primary Concept Model

This is the most important teaching object on the page.

Examples:

- timeline;
- formula;
- word-order rail;
- semantic scale;
- decision tree;
- event sequence;
- role-flow diagram;
- sentence transformation;
- contrast matrix.

The primary model should visually answer:

> **“How does this grammar work?”**

---

## Level 3 — Supporting Learning Blocks

Recommended blocks:

- When to use
- Examples
- Compare
- Common mistake
- Quick practice

These should be easy to scan.

---

## Level 4 — Learning Support

Secondary column / bottom area:

- lesson progress;
- lesson path;
- review recommendation;
- grammar streak when real;
- related lesson;
- add to recall/review plan.

These must never visually overpower the grammar itself.

---

# 5. NEVER FORCE ONE VISUAL TEMPLATE ON EVERY GRAMMAR POINT

This is one of the most important rules.

The example reference uses a **timeline** because Past Perfect is temporal.

That does **not** mean every grammar lesson should contain a timeline.

The AI must first classify the concept into a **Pedagogical Visual Archetype**.

---

# 6. PEDAGOGICAL VISUAL ARCHETYPES

## 6.1 TEMPORAL / ASPECT

Use for:

### English
- Past Simple
- Present Perfect
- Past Perfect
- Continuous tenses
- Future forms

### Chinese
- 了
- 过
- 着
- 在 / 正在
- 了 vs 过
- 在 vs 正在 vs 着

Preferred visual tools:

- timeline;
- event markers;
- completion state;
- before/after relation;
- duration bar;
- experience marker.

---

# 6.2 WORD ORDER / SENTENCE STRUCTURE

Use for:

### English
- question formation
- adverb placement
- indirect questions
- relative clause structure

### Chinese
- time + place + verb order
- 把 sentence
- 被 sentence
- question structures
- 给 / 对 / 跟 placement

Preferred visual:

```text
SUBJECT → TIME → PLACE → VERB → OBJECT
```

or

```text
把 + OBJECT → VERB → RESULT
```

Use:
- draggable slots;
- sentence rails;
- labeled blocks;
- reordering practice.

---

# 6.3 TRANSFORMATION

Use for:

- Active → Passive
- Direct → Reported Speech
- Statement → Question
- adjective → comparative
- regular clause → relative clause

Visual:

```text
SOURCE SENTENCE
      ↓ transformation
TARGET SENTENCE
```

Highlight only changed elements.

---

# 6.4 CONTRAST / CHOICE

Use when learners commonly confuse two or more alternatives.

Examples:

### English
- Present Perfect vs Past Simple
- Will vs Going to
- Much vs Many
- Since vs For
- A / An / The
- Say vs Tell

### Chinese
- 了 vs 过
- 会 vs 能 vs 可以
- 还是 vs 或者
- 再 vs 又
- 就 vs 才

Preferred visual:

```text
A                         B
meaning                   meaning
use case                  use case
signal                    signal
example                   example
```

or a decision flow.

---

# 6.5 SEMANTIC SCALE

Use for grammar expressing degree or modality.

Examples:

### English
- must / have to / should / may / might
- comparative strength
- probability

### Chinese
- 必须 / 应该 / 可以
- 可能 / 一定
- 太 / 很 / 非常

Visual:

```text
weak ─────────────────── strong
might   may   should   must
```

---

# 6.6 ROLE / PARTICIPANT FLOW

Best for:

### Chinese
- 把
- 被
- 给
- 让
- 叫

### English
- passive;
- causative structures.

Visual:

```text
AGENT → ACTION → PATIENT
```

For 把:

```text
SUBJECT → 把 → OBJECT → ACTION / RESULT
```

For 被:

```text
PATIENT → 被 → AGENT → ACTION
```

---

# 6.7 LOGIC RELATION

Use for:

- conditionals;
- because / so;
- although / however;
- if / unless;
- Chinese 因为…所以…
- 虽然…但是…
- 如果…就…

Visual:

```text
CONDITION → RESULT
CAUSE     → EFFECT
CONTRAST  ↔ EXPECTATION
```

---

# 6.8 CLASSIFICATION / SELECTION

Use for:

### English
- articles;
- countable vs uncountable;
- pronouns;
- quantifiers.

### Chinese
- measure words;
- classifier choice;
- demonstrative + measure word;
- numeral phrases.

Visual:

```text
What kind of noun?
   ↓
known / unknown?
   ↓
a / an / the / Ø
```

Chinese:

```text
NUMERAL → MEASURE WORD → NOUN
三      本            书
```

---

# 6.9 RESULT / DIRECTION CHAIN

Especially important for Chinese:

- result complements;
- directional complements;
- potential complements.

Visual:

```text
VERB → RESULT
看  → 懂
吃  → 完
找  → 到
```

Directional:

```text
movement → direction → speaker reference
走       进         来
```

---

# 6.10 PRAGMATIC PARTICLE / DISCOURSE FUNCTION

For:

- 吧
- 呢
- 啊
- 的
- sentence-final 了

Use scenario cards:

```text
Situation
Speaker intention
Sentence
Effect / nuance
```

---

# 7. REQUIRED LESSON BLOCK TYPES

## 7.1 CONCEPT SUMMARY

Required.

Contains:
- title;
- level;
- one-sentence meaning;
- learning objective.

---

## 7.2 PATTERN / FORMULA

Required when the concept has a meaningful form.

Should be visually prominent.

---

## 7.3 VISUAL MODEL

Required when a visualization materially improves understanding.

Do not create decorative diagrams.

Every visual element must teach something.

---

## 7.4 WHEN TO USE

Required.

Use learner-oriented rules.

---

## 7.5 WHEN NOT TO USE

Strongly recommended when confusion is common.

---

## 7.6 EXAMPLES

Required.

Each example must demonstrate one meaningful use case.

Recommended:

```text
sentence
→ short semantic note
```

---

# 7.7 COMPARE

Required when a natural confusion pair exists.

The comparison must answer:

> Why choose A here instead of B?

---

# 7.8 COMMON MISTAKE

Required for high-value learner errors.

Must display:

```text
WHAT learner writes
WHY it is wrong / unsuitable
CORRECT form
```

---

# 8. ERROR CLASSIFICATION RULE

The AI must never label every non-preferred sentence as “wrong”.

Classify learner issues into:

## A. Ungrammatical
The form violates the grammar system.

## B. Wrong for intended meaning/context
The sentence may be grammatical but does not express the intended meaning.

## C. Grammatically possible but unnatural
Form is possible but native usage strongly prefers another expression.

## D. Style/register issue
Meaning and grammar are valid, but register is inappropriate.

This is particularly important for Chinese.

---

# 9. QUICK PRACTICE PRINCIPLES

Practice should verify the main learning objective.

Recommended progression:

```text
1. Recognize
2. Choose
3. Reconstruct
4. Produce
```

---

# 10. MICRO-PRACTICE COMPONENT TYPES

- Multiple choice — best for contrast.
- Fill the gap — best for form.
- Reorder — best for word order.
- Transform — best for passive/reported speech.
- Match — best for meaning/function.
- Error correction — best for common mistakes.
- Scenario choice — best for modal/particle/pragmatic concepts.
- Build a sentence — best for production.

The exercise type must match the concept.

---

# 11. RECALL

After guided practice, test whether the learner can recall the concept without seeing the formula.

---

# 12. TRANSFER

Every lesson should define possible transfer actions.

### Writing
Use the pattern in one paragraph.

### Speaking
Answer a prompt requiring the structure.

### Reading
Find the pattern in a passage.

### Listening
Identify it in a transcript.

---

# 13. ENGLISH-SPECIFIC PEDAGOGICAL RULES

## 13.1 Tense / aspect
Teach:
- time relation;
- aspect meaning;
- signal/context;
- contrast with nearby tense.

## 13.2 Articles
Use decision logic and discourse context.

## 13.3 Modals
Teach:
- speaker stance;
- strength;
- obligation/probability;
- context.

## 13.4 Prepositions
Prefer:
- spatial relation;
- temporal relation;
- collocation;
- usage contrast.

## 13.5 Conditionals
Show:
- condition;
- consequence;
- reality/hypothetical status;
- time reference.

## 13.6 Relative clauses
Visualize:
- antecedent;
- clause attachment;
- missing grammatical role.

---

# 14. CHINESE-SPECIFIC PEDAGOGICAL RULES

Chinese must not look like English grammar translated into Chinese.

## 14.1 Hanzi is primary

Visual priority:

```text
1. Hanzi
2. Pinyin
3. support-language meaning
```

## 14.2 Pinyin behavior

Support states:

```text
off
on
auto/adaptive
reveal on demand
```

## 14.3 Chinese word order
Use rails/slots whenever order is the learning challenge.

## 14.4 Aspect particles
For:
- 了
- 过
- 着

teach aspect meaning, not fake tense equivalence.

## 14.5 Measure words
Teach:
- numeral;
- classifier;
- noun;
- semantic category.

## 14.6 把 / 被
Use participant flow diagrams.

## 14.7 Complements
Use visual decomposition for result and direction.

## 14.8 Chinese particles / pragmatic grammar
Use context/scenario.

## 14.9 Chinese comparison structures
Use entity comparison / visual scale.

---

# 15. LANGUAGE OF EXPLANATION

The lesson has two language dimensions:

```text
learning_language
support_language
```

Never mix support language randomly.

---

# 16. CONTENT DENSITY PRINCIPLE

Each visible block should answer one question.

Good:

```text
Pattern
When to use
Examples
Compare
Common mistake
Practice
```

---

# 17. SEMANTIC COLOR SYSTEM

### Purple
- grammar pattern;
- concept structure;
- active grammar step.

### Green
- correct form;
- successful example;
- positive comparison.

### Orange
- caution;
- common mistake;
- attention;
- active product action.

### Red
- clearly wrong form.

### Neutral
- explanation;
- support text.

Color must remain secondary to text meaning.

---

# 18. TYPOGRAPHY PRINCIPLE

Use typography to distinguish:

```text
Concept
Pattern
Example
Explanation
Annotation
```

Chinese:
- comfortable CJK line height;
- sufficient Hanzi size;
- Pinyin clearly smaller.

---

# 19. DESKTOP LESSON COMPOSITION

Recommended structure:

```text
┌──────────────────────────────────────┬──────────────┐
│ Back                                 │ Progress     │
│                                      │ Lesson path  │
│ Level                                │ Review       │
│ Concept title                        │              │
│ Meaning                              │              │
│                                      │              │
│ PRIMARY VISUAL MODEL                 │              │
│                                      │              │
│ When to use       Examples           │              │
│                                      │              │
│ Compare                              │              │
│                                      │              │
│ Common mistake                       │              │
│                                      │              │
│ Quick practice                       │              │
└──────────────────────────────────────┴──────────────┘
```

---

# 20. MOBILE LESSON COMPOSITION

Mobile becomes:

```text
Concept
↓
Primary model
↓
When to use
↓
Examples
↓
Compare
↓
Common mistake
↓
Practice
↓
Progress / next lesson
```

---

# 21. LESSON DATA MODEL

AI must generate/curate a **lesson model**, not raw HTML.

Recommended conceptual schema:

```json
{
  "concept_id": "en.past_perfect",
  "language": "en",
  "level": "B1",
  "title": "Past Perfect Tense",
  "objective": "Show that one past action happened before another.",
  "meaning": {"summary": "..."},
  "pedagogy": {
    "archetype": "temporal_aspect",
    "primary_visual": "timeline"
  },
  "pattern": {
    "formula": "had + past participle",
    "parts": []
  },
  "visual_model": {
    "type": "timeline",
    "nodes": [],
    "relations": []
  },
  "use_cases": [],
  "non_use_cases": [],
  "examples": [],
  "compare": {},
  "common_mistakes": [],
  "practice": [],
  "recall": [],
  "transfer": {
    "writing": [],
    "speaking": [],
    "reading": [],
    "listening": []
  }
}
```

The actual repository schema may use different field names.

The important rule is:

> **The content model must be structured enough for the renderer to express pedagogy.**

---

# 22. PEDAGOGY CLASSIFIER

Before creating or revising any lesson, AI must classify the concept.

Required reasoning output internally:

```text
Concept:
Core meaning:
Main learner difficulty:
Confusion pair:
Pedagogical archetype:
Primary visual:
Best practice type:
Likely mistake:
Language-specific concern:
```

Only then generate the lesson.

---

# 23. COMPONENT MAPPING

Renderer should map pedagogy to reusable visual components.

Examples:

```text
timeline
word_order_rail
sentence_slots
transformation_pair
contrast_matrix
decision_tree
semantic_scale
role_flow
logic_flow
classifier_map
complement_chain
scenario_card
formula_block
mistake_block
example_block
practice_block
```

Do not hardcode the Past Perfect layout specifically.

---

# 24. CONTENT VALIDATION HARD GATES

A lesson cannot be marked product-ready if any of these fail.

## Gate A — Concept specificity
Could the same explanation be pasted into another grammar lesson?

If yes → FAIL.

## Gate B — Visual usefulness
Does the primary visualization explain the concept?

If decorative → FAIL.

## Gate C — Contrast
If a major confusion pair exists, is it explicitly explained?

If no → FAIL.

## Gate D — Error realism
Is the common mistake something a learner would realistically produce?

If generic → FAIL.

## Gate E — Practice alignment
Does practice test the exact lesson objective?

If not → FAIL.

## Gate F — Language authenticity
Are examples natural for the target language?

If translated mechanically → FAIL.

## Gate G — EN/ZH correctness
Shared feature works equally well for English and Chinese.

## Gate H — Support-language consistency
No random EN/VI/ZH mixing.

---

# 25. ANTI-PATTERNS

AI must NOT solve Grammar redesign by:

- CSS-only polish;
- generic repeated lesson blocks;
- same visualization for all concepts;
- huge text pages;
- placeholder examples;
- test/debug learner copy.

---

# 26. IMPLEMENTATION ARCHITECTURE

The Grammar product should have four layers.

```text
GRAMMAR KNOWLEDGE
      ↓
PEDAGOGICAL LESSON MODEL
      ↓
VISUAL COMPONENT RENDERER
      ↓
LEARNER INTERACTION / PROGRESS
```

## 26.1 Grammar Knowledge
Contains canonical concept truth.

## 26.2 Pedagogical Model
Decides:
- lesson flow;
- visual archetype;
- block ordering;
- practice type.

## 26.3 Renderer
Renderer should not invent pedagogy.

## 26.4 Learner State
Separate from content.

Contains:
- completion;
- current step;
- attempts;
- recall status;
- review scheduling.

---

# 27. COMPLETION SEMANTICS

Opening the lesson is not completion.

Completion must reflect learning activity.

---

# 28. REVIEW / SPACED RECALL

Grammar concepts may be added to Library/Active Recall.

Recall object should reference:

```text
concept_id
```

not duplicate the entire grammar lesson.

---

# 29. CROSS-SKILL INTEGRATION

Writing feedback:

```text
Issue → linked Grammar concept
```

Speaking feedback:

```text
Pattern weakness → linked Grammar concept
```

Reading:

```text
Selected sentence → explain Grammar concept
```

Listening:

```text
Transcript structure → linked Grammar concept
```

No skill should create a duplicate version of the same Grammar concept.

---

# 30. AI GENERATION / CURATION WORKFLOW

When AI is asked to improve all Grammar lessons:

## Phase 1 — Audit
For each concept:
- verify content;
- classify archetype;
- identify missing blocks;
- identify weak examples;
- identify confusion pair.

## Phase 2 — Model
Create/update structured lesson model.

## Phase 3 — Render
Use shared components.

## Phase 4 — Validate
Check:
- content specificity;
- language accuracy;
- visual model;
- practice;
- EN/ZH parity.

## Phase 5 — Regression
Ensure:
- stable IDs preserved;
- progress preserved;
- route/contracts preserved.

---

# 31. DEFINITION OF DONE — ONE LESSON

A lesson is DONE only when:

```text
[ ] objective is precise
[ ] core meaning is clear
[ ] pattern/form is explicit when relevant
[ ] primary visualization matches the concept
[ ] use cases are actionable
[ ] examples are natural
[ ] contrast is included when necessary
[ ] common mistake is realistic
[ ] error classification is accurate
[ ] practice tests the concept
[ ] recall exists when appropriate
[ ] transfer path exists
[ ] support language is consistent
[ ] mobile works
[ ] learner progress works
[ ] no placeholder/debug content
```

---

# 32. DEFINITION OF DONE — FULL GRAMMAR SYSTEM

The Grammar system is not complete just because one lesson looks good.

System-level acceptance:

```text
English curriculum
→ every concept has appropriate pedagogy

Chinese curriculum
→ every concept has appropriate pedagogy

Shared renderer
→ supports all required visual archetypes

Content validation
→ catches incomplete/generic lessons

Mobile
→ supports all archetypes

Progress
→ preserved

Cross-skill links
→ concept ID based
```

---

# 33. AI INSTRUCTION — CRITICAL

When asked to redesign Grammar, do NOT interpret the task as:

> “Improve the grammar page UI.”

Interpret it as:

> **“Transform every grammar concept into a complete structured lesson model with the best concept-specific visual teaching representation, then render it using the Orena Grammar Lesson Design System.”**

The objective is **pedagogical transformation**, not decorative UI refactoring.

---

# 34. REQUIRED AGENT REPORT

After a Grammar batch, AI should report:

```text
Concepts audited:
Concepts upgraded:
English:
Chinese:

Archetypes used:
- temporal/aspect
- word order
- contrast
- transformation
- logic
- ...

Lessons still generic:
Lessons missing contrast:
Lessons missing practice:
Lessons requiring human linguistic review:

Renderer components added:
Existing components reused:

Regression tests:
Visual checks:
```

Do not say “Grammar redesign complete” after improving only a few sample lessons.

---

# 35. GOLDEN REFERENCE PRINCIPLE

The reference UI should be interpreted as:

```text
VISUAL HIERARCHY
+
PEDAGOGICAL CLARITY
+
CONCEPT-SPECIFIC DIAGRAM
+
CONCISE TEACHING BLOCKS
+
IMMEDIATE PRACTICE
```

NOT:

```text
white background
+ rounded cards
+ purple borders
```

The visual style is a consequence of instructional structure.

---

# 36. FINAL NORTH STAR

Every Grammar lesson should make the learner feel:

> “I can see how this grammar works.”

not merely:

> “I read an explanation of this grammar.”

The best lesson turns an abstract rule into a visible mental model.

For English and Chinese alike:

```text
SEE IT
→ UNDERSTAND IT
→ DISTINGUISH IT
→ BUILD IT
→ USE IT
→ REMEMBER IT
```

That is the canonical Orena Grammar lesson experience.
