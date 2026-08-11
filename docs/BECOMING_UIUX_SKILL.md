# BECOMING — UI/UX Skill v1.0

## Purpose
Use this skill whenever designing, reviewing, implementing, or refactoring the interface of the product.

BECOMING is a multilingual Language Mastery & Expression Platform. English and Chinese are first-class learning spaces. The product may expand to Writing, Vocabulary, Reading, Speaking, Listening, and AI Tutor.

The product is not a generic AI dashboard, not a children's learning game, and not an exam score calculator. It is a place where learners understand how they use language, discover what is holding them back, see small improvements, build confidence, and develop their own voice.

---

## North Star

**The learner is the protagonist. Their work is the evidence. AI is the guide.**

Every screen should make the learner feel that something about them is being understood, developed, or expressed.

The core emotional outcome is:

> “I am becoming better, and I understand exactly why.”

The product should gradually move the learner from correctness to mastery, and from mastery to identity:

Learn → Understand → Express → Create → Influence

---

## Design Direction

### Editorial Intelligence
**Bold in meaning. Calm in presentation. Human in guidance.**

Visual personality:
- Bold, not aggressive.
- Calm, not empty.
- Soft, not childish.
- Intelligent, not futuristic.
- Minimal, not plain.
- Premium, not luxurious.
- Crafted, not decorative.
- Professional, not complicated.

The interface should feel like a beautifully crafted notebook that happens to understand its owner, not software trying to demonstrate how much AI it contains.

---

## Product Principles

### 1. Growth over judgment
Scores locate the learner; feedback explains; coaching points forward; progress proves improvement.

Never show a score without meaning, context, or next action.

### 2. Diagnose before teaching
Do not teach every possible weakness. Identify recurring patterns, prioritize them, and surface the current bottleneck.

Twenty detected issues may become three recurring patterns and one primary focus.

### 3. Feedback lives inside the work
Feedback should stay connected to the learner’s actual sentence, paragraph, speech, or answer. Do not detach analysis into a generic report when contextual feedback is possible.

### 4. Show evidence, not just advice
Important feedback should connect:
WHAT → WHY → EVIDENCE → BETTER EXAMPLE → ACTION.

Also show where the learner already used the concept correctly when possible.

### 5. Progress lives in small victories
Recognize the disappearance of repeated errors, better structure, improved naturalness, stronger word choice, increasing consistency, and better expression.

Reward mastery, not activity.

### 6. The interface grows with the learner
Beginner experiences use more scaffolding, visible examples, shorter explanations, and clearer actions. Advanced experiences use more nuance, deeper analysis, less scaffolding, and more autonomy.

Do not infantilize beginners. Do not overload advanced learners.

### 7. From correctness to identity
The product should eventually help answer not only “Is this correct?” but also “How do I express myself?” and “What kind of writer or communicator am I becoming?”

---

## Multilingual Rule

English and Chinese share the same product identity but not the same linguistic mechanics.

**Same identity ≠ same typography implementation ≠ same feedback taxonomy.**

Chinese must never be treated as a translated English mode.

Pinyin is learning assistance, not decoration. Show it when it supports the learner; reduce or remove it as proficiency increases.

Feedback categories must be language-aware. English concepts must not be mechanically forced onto Chinese.

---

# VISUAL SYSTEM

## 1. Composition
Major screens should usually follow:

STATEMENT → CONTEXT → PRIMARY EXPERIENCE → DETAILS ON DEMAND

Every important viewport must answer quickly:
1. Where am I?
2. What matters right now?
3. What should I do next?

Each viewport should have one dominant idea.

Do not let scores, streaks, recommendations, achievements, analytics, promotions, and AI suggestions all compete at once.

---

## 2. Typography

### Font strategy
Use two roles, not many unrelated fonts.

**Display / Editorial Latin:** `Roboto Condensed` or a similarly strong, narrow sans-serif.
Use only for short high-impact English statements, milestones, section identities, and result headlines.

**UI / Reading Latin:** `Inter`.
Use for navigation, body text, controls, long reading, writing editor support, labels, and feedback explanations.

**Chinese UI / Reading:** `Noto Sans SC`.
Use for Simplified Chinese text and mixed-language learning content.

Fallback stack should preserve system readability if a preferred font is unavailable.

Never distort Chinese characters to imitate condensed Latin display typography.

### Type scale
Desktop target scale:
- Display XL: 64px / 0.95 line-height / 800
- Display L: 48px / 1.0 / 800
- H1: 36px / 1.1 / 750
- H2: 28px / 1.2 / 700
- H3: 22px / 1.3 / 650
- Body L: 18px / 1.65 / 400
- Body: 16px / 1.6 / 400
- UI: 14px / 1.4 / 500
- Meta: 12px / 1.4 / 500

Mobile scale:
- Display XL: 44px
- Display L: 36px
- H1: 30px
- H2: 24px
- H3: 20px
- Body L: 17px
- Body: 15–16px

Chinese display sizes may be slightly smaller when needed for optical balance, but must preserve visual authority.

Use typography, spacing, and placement before color to create hierarchy.

---

## 3. Color

### Neutral foundation
Primary UI should be dominated by quiet neutrals.

Recommended starting palette:
- Canvas: `#F7F7F5`
- Surface: `#FFFFFF`
- Surface muted: `#F0F1EF`
- Ink strong: `#111214`
- Ink: `#303236`
- Ink muted: `#72757B`
- Border subtle: `#E4E5E2`
- Border strong: `#D2D4D0`

### Brand accent
Use one primary accent sparingly.

Recommended starting accent:
- Accent 600: `#FF6A1A`
- Accent 500: `#FF7A2F`
- Accent 100: `#FFF0E6`

The accent is for active states, important actions, selected learning focus, and carefully chosen brand moments. It must not flood the interface.

### Semantic colors
Use semantic colors for meaning, not decoration:
- Positive: `#2F8F5B`
- Attention: `#D89B22`
- Important: `#D75B45`
- Informational: `#3F70C8`

Do not use red for every error.

Severity should be communicated with a combination of color, weight, label, and position—not color alone.

---

## 4. Spacing

Base unit: 4px.

Core spacing scale:
`4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96`

Rules:
- Prefer 24–32px between related sections.
- Prefer 48–80px between major narrative sections.
- Use generous whitespace around dominant statements.
- Do not fill empty space simply because it exists.
- Reduce spacing on mobile without collapsing hierarchy.

---

## 5. Layout

Desktop content max width: 1280–1440px depending on experience.
Reading / essay text max width: approximately 680–760px.

Writing desktop pattern:
- Writing/editor area: ~60–68%
- Contextual feedback area: ~32–40%

Do not hardcode those percentages when content requires another solution. Preserve the principle: the learner’s work and AI feedback must coexist without either becoming cramped.

Mobile is a continuation experience, not a compressed desktop dashboard. Use contextual feedback sheets, inline expansion, and focused states instead of forcing two desktop panels side by side.

---

## 6. Surfaces and depth

Direction: **Soft Physical Digital**.

Use:
- subtle surface contrast;
- quiet borders;
- soft shadows;
- moderate corner rounding;
- restrained elevation.

Suggested radius scale:
- Small control: 8px
- Standard control: 10px
- Card/object: 14px
- Large surface: 18px
- Hero/feature object: 22px max

Avoid excessive pill shapes.

Suggested shadow levels:
- Level 0: none
- Level 1: `0 1px 2px rgba(17,18,20,.05), 0 4px 12px rgba(17,18,20,.04)`
- Level 2: `0 8px 28px rgba(17,18,20,.08)`
- Overlay: `0 16px 48px rgba(17,18,20,.14)`

Use the lowest level that communicates hierarchy.

If spacing can separate content, do not add a container.
If typography can create hierarchy, do not add a border.
If position can create hierarchy, do not add a background.

---

## 7. Cards

Cards are allowed only when the content is a meaningful independent object: a saved piece of writing, exercise, milestone, learning pattern, goal, or language space.

Do not turn every metric or category into a separate card.

Avoid nested card-inside-card layouts.

---

## 8. Buttons

Primary button:
- solid brand accent;
- clear action verb;
- no gradient;
- medium radius, not pill by default;
- strong but not oversized.

Secondary button:
- neutral surface or quiet outline;
- visually lower priority.

Tertiary action:
- text or icon-text;
- use for non-destructive low-priority actions.

Every screen should normally have one obvious primary action.

---

## 9. Inputs and editor

The writing editor is a workspace, not a form field.

It should have:
- high text readability;
- comfortable line height;
- minimal surrounding chrome;
- strong focus state;
- subtle contextual highlights;
- no aggressive error styling while the learner is drafting unless requested.

Do not make the editor feel like a boxed textarea inside a dashboard card.

---

## 10. Feedback system

### Feedback priority
Do not display every detected issue equally.

Prioritize:
1. Current bottleneck
2. Recurring important pattern
3. Improvement opportunity
4. Minor refinement

### Feedback anatomy
For important feedback, support these layers:
- Pattern
- Evidence in learner work
- Why it matters
- Better usage / examples
- Suggested action
- Progress context

Use progressive disclosure. Show only what is needed first.

### Strength feedback
Also mark evidence of good usage. The learner should see what they are already doing well.

---

## 11. Progress

Do not default to business analytics charts.

Prefer:
- mastery stages;
- before/now comparisons;
- journey markers;
- recurring pattern stability;
- small trend visualization only when useful.

Suggested mastery vocabulary:
`Emerging → Developing → Stable → Mastered`

Benchmark scores and personal mastery must remain conceptually separate.

Benchmark answers: “Where am I compared with a real standard?”
Personal mastery answers: “How am I changing over time?”

Never claim equivalence with IELTS, TOEIC, HSK, CEFR, or native-level competence unless the scoring model is validated for that claim. When not validated, clearly label results as estimates.

---

## 12. Editorial statement pattern

Use short, confident, human statements at meaningful moments.

Examples:
- `YOUR IDEAS ARE STRONGER.`
- `ONE PATTERN IS HOLDING YOU BACK.`
- `THIS ERROR IS DISAPPEARING.`
- `YOU'RE GETTING CLEARER.`

Supporting text should explain the evidence immediately below.

Do not use dramatic statements when the evidence does not justify them.

---

## 13. Context landmarks

Large low-contrast numbers or labels may be used at major journey moments, inspired by editorial layouts:

`01 DISCOVER`
`02 PRACTICE`
`03 UNDERSTAND`
`04 REFINE`
`05 MASTER`

Use them sparingly. They are spatial landmarks, not decoration.

---

## 14. Icons

Use simple, geometric, consistent icons.

Icons support actions and meaning. They do not replace clear language when the icon is ambiguous.

Avoid default AI metaphors such as robot heads, brains, magic wands, and sparkle icons unless a specific context genuinely requires them.

---

## 15. 3D and illustration

3D is reserved for identity moments:
- onboarding;
- empty states;
- major milestones;
- language selection;
- feature introduction;
- major achievements.

Style:
- soft;
- rounded;
- tactile;
- matte;
- minimal;
- studio-lit;
- clean.

Avoid chrome, neon, cyberpunk, glass-heavy, hyper-realistic, or generic futuristic AI aesthetics.

The visual metaphor should often express refinement: fragmented → structured, uncertain → clear, developing → mastered.

---

## 16. Motion

Every animation must do at least one job:
- explain;
- connect;
- confirm;
- reward.

Suggested timing:
- Micro state: 120–180ms
- Standard transition: 180–260ms
- Context reveal: 240–360ms
- Milestone reward: 450–700ms

Prefer calm easing and subtle motion. No default confetti.

Respect reduced-motion accessibility settings.

---

## 17. Accessibility

Minimum expectations:
- WCAG AA color contrast for text and controls;
- keyboard navigability;
- visible focus indicators;
- semantic HTML where applicable;
- no meaning communicated only by color;
- readable text sizing;
- proper CJK line breaking;
- reduced motion support;
- touch targets appropriate for mobile.

Accessibility is part of quality, not a final polish pass.

---

# EXPERIENCE PATTERNS

## Home
Do not build a generic analytics dashboard.

Lead with one meaningful current-state statement and one next action.

Example structure:
- Editorial learner insight
- Current focus / bottleneck
- Continue action
- Secondary progress / recent work below

## Writing workspace
Desktop:
- learner work dominates the workspace;
- AI feedback stays contextual and visible;
- prompt/context is available but does not dominate;
- next action is clear.

Mobile:
- writing is primary;
- tap/selection reveals contextual feedback;
- use sheet/inline expansion instead of narrow sidebars.

## Review result
Lead with the most meaningful insight, not the total score.
Then show evidence, important patterns, strengths, benchmark estimate, and next focus.

## Language spaces
English and Chinese have separate learning histories, levels, patterns, and goals while belonging to one learner identity.

## Beginner mode
More visual guidance, concrete examples, shorter tasks, lower density, stronger encouragement.

## Advanced mode
More nuance, rhetorical analysis, tone, naturalness, voice, argument quality, style, and autonomy.

---

# ANTI-PATTERNS — NON-NEGOTIABLE

Never:
- turn every section into a card;
- build a generic SaaS dashboard unless the task truly requires one;
- use purple/blue gradients merely to signal AI;
- use sparkle, robot, or brain icons as default AI identity;
- use charts when a sentence communicates the insight better;
- use excessive borders to create hierarchy;
- use excessive shadow or floating surfaces;
- nest cards unnecessarily;
- use color without semantic purpose;
- overwhelm learners with every detected issue;
- make error states visually aggressive;
- infantilize beginner learners;
- force English typography mechanics onto Chinese;
- treat Chinese as translated English UI;
- show pinyin when it no longer supports learning;
- use animation purely for spectacle;
- use 3D illustration everywhere;
- let gamification visually dominate learning;
- let scores dominate explanation;
- place AI chat at the center of every experience;
- sacrifice readability for personality;
- sacrifice personality for minimalism;
- hardcode content, user level, language behavior, or feedback data into UI components;
- duplicate design logic across pages instead of using tokens and reusable components.

---

# IMPLEMENTATION RULES FOR AI CODING AGENTS

Before coding a screen:
1. State the dominant learner goal for the screen in one sentence.
2. State the single dominant idea in the viewport.
3. Identify the primary action.
4. Identify what should be progressively disclosed.
5. Identify which information is evidence versus decoration.
6. Check English and Chinese behavior.
7. Reuse existing tokens/components before creating new ones.

During implementation:
- Use design tokens, not scattered magic values.
- Build reusable primitives and meaningful domain components.
- Preserve existing working behavior when adding new features.
- Do not hardcode API results or sample data into production components.
- Keep business logic separate from presentation.
- Avoid duplicate state and duplicate derived calculations.
- Maintain responsive behavior from the beginning.
- Add loading, empty, error, success, and disabled states.
- Keep accessibility in the first implementation, not as a later task.

After implementation, perform a UI review against this checklist:
- Is the learner, not the software, the protagonist?
- Is there one clear dominant idea?
- Is the next action obvious?
- Did the UI become a dashboard without a strong reason?
- Are there unnecessary cards, borders, shadows, colors, icons, or charts?
- Is feedback prioritized rather than dumped?
- Is evidence connected to the learner’s work?
- Does the screen work in English and Chinese?
- Does mobile preserve the experience rather than compress desktop?
- Does the result feel calm, intelligent, human, and crafted?

If any answer is no, revise before calling the task complete.

---

# AI BUILD PROMPT

When asked to build a new BECOMING screen or feature, follow this instruction:

> You are designing and implementing BECOMING, a multilingual Language Mastery & Expression Platform. Follow the BECOMING UI/UX Skill as a binding product constraint, not loose inspiration. Do not start by choosing generic cards or dashboard patterns. First identify the learner goal, dominant idea, primary action, and progressive disclosure strategy. Design the information hierarchy before component styling. Use Editorial Intelligence: bold in meaning, calm in presentation, human in guidance. Treat English and Chinese as first-class languages with shared identity but language-specific typography and learning mechanics. Use the learner’s work as evidence and AI as the guide. Prioritize current bottlenecks, strengths, and meaningful progress over raw analytics. Build reusable, responsive, accessible components using design tokens. Avoid hardcoding and avoid breaking existing behavior. Before finishing, review the screen against the anti-patterns and implementation checklist in this skill.

