# BECOMING — VISUAL REFERENCE ALIGNMENT ADDENDUM v1.0

> **Mục đích:** Đây là lớp bổ sung cho `BECOMING_UIUX_SKILL.md`, không thay thế hay viết lại triết lý gốc.
> Khi có xung đột, addendum này chỉ được ưu tiên ở các quyết định liên quan đến **visual execution, contrast, material, depth, composition và reference alignment**.
>
> **Mục tiêu thị giác:** đưa chất lượng UI tiến gần các reference WellX Tech về **tương phản, độ nổi, cảm giác vật thể số mềm, bố cục editorial và độ tinh xảo**, nhưng **không copy branding, poster layout, component hay nhận diện**.

---

## 0. NON-NEGOTIABLE INTENT

BECOMING không được trông như:

- generic SaaS dashboard;
- dark analytics console;
- flat Tailwind template;
- chuỗi card có cùng trọng lượng;
- “AI app” với purple gradient, glow, sparkle, brain/robot icon;
- poster copy từ reference.

BECOMING phải gợi cảm giác:

> **Editorial clarity + tactile digital objects + quiet intelligence + strong contrast + carefully composed space.**

Giữ nguyên triết lý gốc:

- Learner is the protagonist.
- Work is the evidence.
- AI is the guide.
- Bold in meaning.
- Calm in presentation.
- Human in guidance.

Addendum này bổ sung lớp còn thiếu:

> **Contrast → Material → Depth → Presence → Visual calibration.**

---

# 1. REFERENCE INTERPRETATION RULE

Reference WellX là **visual calibration reference**, không phải UI specification.

### Được học từ reference

- tương phản black/white hoặc dark/light mạnh;
- focal point rõ ngay khi nhìn lướt;
- headline editorial lớn và tự tin;
- negative space sạch;
- surface matte, bo mềm, có cảm giác vật thể;
- chiều sâu rõ nhưng tiết chế;
- directional lighting tinh tế;
- contact shadow;
- accent dùng rất ít;
- một hero object/hero surface có presence;
- supporting information phải lùi xuống;
- bố cục giống một sản phẩm được “compose”, không phải dữ liệu được “xếp vào grid”.

### Không được copy

- WellX logo;
- poster structure nguyên xi;
- exact typography identity;
- exact orange usage;
- exact mockup/device shape;
- exact page numbers;
- exact icon/illustration;
- marketing composition nếu làm hại usability.

**Rule:** match **visual qualities**, not **literal layout**.

---

# 2. LIGHT-FIRST EDITORIAL IDENTITY

Dark mode là **display preference**, không phải brand identity.

Ưu tiên light / soft-light mặc định cho:

- Home
- Journey / Progress
- Reflection
- Review Summary
- Profile
- Library
- Onboarding
- Mastery / Milestone
- Language selection
- Goal setting
- Major AI insight overview

Dark mode phù hợp hơn với:

- focused writing workspace;
- long reading session;
- immersive practice;
- night mode;
- user-selected appearance.

### Rule

> Premium phải đến từ composition, contrast, material quality, typography và motion — không phải vì mọi thứ đều dark.

BECOMING phải nhận diện được ở cả light lẫn dark.

---

# 3. TONAL HIERARCHY SYSTEM

Các hierarchy level kề nhau phải phân biệt được **ngay cả khi bỏ border**.

Dùng conceptual levels:

1. Canvas
2. Section surface
3. Primary surface
4. Raised object
5. Floating control
6. Accent / signal

Nếu blur toàn bộ text, hierarchy vẫn phải đọc được.

## 3.1 Light theme target

```text
Canvas            ≈ warm/off white
Section surface   ≈ neutral hơi khác canvas
Primary surface   ≈ clean white / near-white
Raised object     ≈ surface rõ edge + depth
Floating control  ≈ elevation hoặc contrasting fill rõ hơn
Ink               ≈ near-black
Muted text        ≈ lùi xuống nhưng vẫn dễ đọc
```

Tránh xếp nhiều màu gần như:

```text
#F7F7F7
#F8F8F8
#F9F9F9
#FAFAFA
```

rồi dùng border để cứu hierarchy.

## 3.2 Dark theme target

Không build toàn UI bằng các near-black quá giống nhau.

Sai nếu visual difference quá nhỏ:

```text
Canvas   #0E1418
Panel    #11181D
Card     #141C21
Child    #171F24
```

Dark mode vẫn cần tonal separation, highlight và depth cue rõ.

---

# 4. MATERIAL MODEL — “SOFT PHYSICAL DIGITAL”

Surface của BECOMING phải cảm thấy:

- solid;
- matte;
- softly rounded;
- calm;
- lightly tactile;
- physically plausible;
- studio-lit;
- refined.

Không được:

- glassy;
- chrome-like;
- neon;
- wet/plastic;
- overly neumorphic;
- hyper-realistic;
- gaming-oriented.

## Material formula

Raised object phải có depth từ tổ hợp:

```text
1. tonal separation
2. edge definition
3. directional highlight
4. ambient shadow
5. contact shadow
6. optional subtle material gradient
```

Không dùng một `box-shadow` generic cho toàn bộ depth system.

---

# 5. DEPTH TOKENS

Phải có reusable elevation token. Không tự nghĩ shadow mới cho từng page.

## DEPTH-0 — Canvas

```text
Elevation: none
Shadow: none
Border: none hoặc chỉ structural
```

## DEPTH-1 — Section Surface

```text
Tonal separation: low
Edge: subtle
Shadow: minimal hoặc none
Purpose: grouping, không floating
```

## DEPTH-2 — Raised Surface

Dùng cho review module, learning object, meaningful card.

Suggested light-theme starting point:

```css
border: 1px solid rgba(15, 18, 20, 0.08);

box-shadow:
  0 1px 1px rgba(15, 18, 20, 0.04),
  0 5px 14px rgba(15, 18, 20, 0.06),
  0 18px 42px rgba(15, 18, 20, 0.05);

background:
  linear-gradient(
    180deg,
    rgba(255,255,255,1) 0%,
    rgba(249,249,247,1) 100%
  );
```

Optional inner edge:

```css
inset 0 1px 0 rgba(255,255,255,0.85)
```

## DEPTH-3 — Hero Object

Dùng tiết chế cho:

- current bottleneck;
- major progress insight;
- mastery object;
- milestone;
- major review module;
- language learning identity object.

Suggested light-theme starting point:

```css
border: 1px solid rgba(15, 18, 20, 0.09);

box-shadow:
  inset 0 1px 0 rgba(255,255,255,0.9),
  0 2px 3px rgba(15, 18, 20, 0.05),
  0 10px 26px rgba(15, 18, 20, 0.09),
  0 28px 70px rgba(15, 18, 20, 0.08);
```

Hero object có thể dùng gradient cực nhẹ để tạo material, không dùng để trang trí.

## DEPTH-4 — Floating Micro Surface

Dùng cho:

- button;
- segmented control;
- popover;
- tooltip;
- floating mini-action;
- selected chip.

Shadow phải nhỏ và chặt hơn Hero Object.

---

# 6. CONTACT SHADOW RULE

Tactile component phải có cảm giác **đang đặt trên một mặt phẳng**.

### Ambient shadow

- blur lớn hơn;
- opacity thấp hơn;
- tách object khỏi canvas.

### Contact shadow

- chặt hơn;
- gần cạnh dưới;
- rõ hơn một chút;
- tạo cảm giác object chạm bề mặt.

Không làm ordinary UI như đang floating 30px trên không.

---

# 7. DIRECTIONAL LIGHT RULE

Major tactile object phải dùng cùng virtual light source.

Mặc định:

> **soft light from upper-left / upper-front**

Cho phép:

- highlight nhẹ ở top/left;
- shadow hơi rõ hơn ở lower/right;
- physical presence nhất quán.

Không đảo hướng sáng ngẫu nhiên giữa các component.
Không dùng shiny specular effect.

---

# 8. EDGE DEFINITION RULE

Dùng:

- neutral border tinh tế;
- optional inner top highlight;
- slight tonal shift ở lower edge.

Tránh:

- thick borders;
- high-contrast outline everywhere;
- double border;
- glowing border;
- border làm toàn bộ hierarchy.

**Test:** nếu tắt shadow mà UI chỉ còn là grid các rectangle có viền, surface system đang sai.

---

# 9. CONTRAST REQUIREMENTS

BECOMING cần dải tương phản rộng hơn implementation hiện tại.

## 9.1 Primary text

Primary display text phải gần near-black / near-white tùy theme.
Không được washed-out.

## 9.2 Supporting text

Supporting copy phải lùi rõ nhưng vẫn đọc thoải mái.

## 9.3 Visual focal point

Mỗi major viewport chỉ nên có một focal point chính.

## 9.4 Accent scarcity

Accent phải ít để còn ý nghĩa.

Recommended visual mindset:

```text
~80–90% neutral
~8–15% structural tonal variation
~2–5% semantic/accent emphasis
```

Đây là guideline thị giác, không phải công thức kỹ thuật cứng.

---

# 10. ACCENT COLOR RULE

Accent chỉ dùng cho:

- primary CTA;
- selected / active state;
- major progress signal;
- small recognition detail;
- một anchor quan trọng trong hero module.

Không rải accent lên:

- mọi icon;
- mọi label;
- mọi border;
- mọi metric;
- mọi title.

Nếu cả screen đều accent thì không có gì được accent.

---

# 11. EDITORIAL COMPOSITION RULE

Major screen nên theo **editorial composition**, không theo database composition.

Preferred flow:

```text
STATEMENT
↓
short contextual support
↓
HERO EXPERIENCE / HERO OBJECT
↓
structured evidence
↓
secondary detail
```

Tránh:

```text
Page title
↓
4 equal metric cards
↓
4 more cards
↓
chart
↓
another card
```

trừ khi nhiệm vụ thật sự là analytics dashboard.

---

# 12. ONE HERO PRESENCE PER MAJOR VIEW

Mỗi important screen phải có ít nhất một element có visual presence dễ nhớ.

Ví dụ:

- dominant writing feedback object;
- progress object;
- mastery surface;
- evidence module;
- learning path visualization;
- tactile level/milestone object.

Hero không bắt buộc là 3D illustration. Một UI surface tốt cũng có thể là hero.

### Rule

> Hero phải mạnh hơn supporting section xung quanh.

Không để bốn card bằng nhau cạnh tranh với hero.

---

# 13. SAME-WEIGHT CARD PROHIBITION

Tránh:

```text
[Metric]
[Metric]
[Metric]
[Metric]
```

khi một insight quan trọng hơn.

Ưu tiên:

```text
[      PRIMARY INSIGHT      ]
[ evidence ] [ evidence ] [ evidence ]
```

hoặc:

```text
Primary insight
Supporting metrics integrated around it
```

Data hierarchy phải dẫn visual hierarchy.

---

# 14. 3D / TACTILE COMPONENT USAGE

Dùng tactile treatment mạnh hơn cho:

- milestone;
- mastery state;
- current bottleneck;
- major progress indicator;
- language object;
- key empty state;
- onboarding object;
- learning identity object.

Không biến mọi:

- list row;
- label;
- stat;
- feedback item;
- menu entry;
- table cell

thành 3D object.

### Desired effect

> Một vài object được craft tốt làm cả product cảm thấy tactile.

Quá nhiều 3D object sẽ thành noisy và toy-like.

---

# 15. LARGE TYPOGRAPHY — EDITORIAL PUNCH

Reference dùng contrast mạnh giữa display typography và supporting copy.
BECOMING phải dùng điều này quyết đoán hơn.

Major statement có thể:

- lớn;
- bold;
- compact;
- ngắn;
- có ý nghĩa cảm xúc;
- visually dominant.

Ví dụ về structure:

```text
YOUR WRITING
IS BECOMING
MORE PRECISE.
```

```text
ĐIỀU NÀY
ĐANG TRỞ NÊN
ỔN ĐỊNH.
```

```text
你的表达
越来越
自然
```

Supporting text phải quiet hơn đáng kể.

Không dùng poster-scale typography cho mọi page title.
Chỉ dùng ở major emotional/product moment.

---

# 16. CJK / CHINESE VISUAL PARITY

Chinese là first-class.
Không ép Chinese typography mô phỏng Latin condensed display.

Chinese phải giữ:

- visual authority;
- hierarchy;
- scale;
- spacing rhythm;
- editorial confidence.

Nhưng dùng CJK-appropriate type mechanics.

Đảm bảo:

- line-height thoải mái;
- không horizontal compression giả;
- wrapping đúng;
- font weight đọc được;
- không thêm pinyin nếu không hỗ trợ learning.

**Same identity ≠ same glyph geometry.**

---

# 17. RADIUS SYSTEM

Suggested hierarchy:

```text
small controls:       8–10px
standard controls:   10–12px
standard surface:    14–18px
hero surface:        18–24px
tactile object:      18–28px tùy kích thước
```

Không dùng pill radius cho mọi rectangle.
Pill chỉ dành cho control/state thực sự mang semantics pill.

---

# 18. MICRO-DETAIL QUALITY

“Minimal but not boring” phải đến từ chi tiết nhỏ có chủ đích.

Ví dụ:

- hover lift chính xác;
- selected control hơi “settle” vào trong;
- focus có highlight nhẹ;
- feedback annotation nối đúng phrase;
- progress object thay đổi depth nhẹ khi mastered;
- semantic accent xuất hiện đúng evidence point;
- microcopy ngắn và cụ thể.

Không thêm decoration noise để giả cảm giác crafted.

---

# 19. INTERACTION DEPTH

Interactive state nên tác động nhiều hơn color khi hợp lý.

### Hover

- tonal change nhỏ;
- apparent lift 1–2px;
- edge rõ hơn chút;
- không exaggerated floating.

### Pressed

- elevation giảm;
- shadow nhỏ hơn;
- surface đổi tone rất nhẹ.

### Selected

- semantic accent hoặc structural contrast rõ hơn;
- có thể dùng subtle inner edge.

### Disabled

- giảm contrast và depth;
- không hạ opacity đến mức khó đọc.

---

# 20. DARK MODE MATERIAL RULES

Khi dùng dark mode, vẫn phải có physical separation.

Dùng:

- visibly distinct surfaces;
- subtle top highlights;
- controlled shadow;
- restrained borders;
- readable primary typography.

Không build:

> black canvas → dark gray panel → slightly less dark card → border.

Dark surface vẫn cần material logic.

---

# 21. JOURNEY / PROGRESS SCREEN SPECIFIC RULE

Journey screen phải ưu tiên reflection + transformation hơn analytics.

- editorial statement trước;
- một major progress/identity/insight object bên dưới;
- evidence secondary;
- tránh top row 4 analytical boxes bằng nhau làm dominant composition;
- progress phải có cảm giác tangible;
- historical evidence dùng làm proof, không làm visual noise;
- light theme mặc định trừ khi user chọn dark.

Desired hierarchy:

```text
EMOTIONAL / EDITORIAL STATEMENT
↓
WHAT IS CHANGING
↓
PRIMARY TACTILE PROGRESS OBJECT
↓
EVIDENCE FROM REAL WORK
↓
DEEPER HISTORY
```

---

# 22. WRITING REVIEW SCREEN SPECIFIC RULE

Writing Review:

- AI feedback có thể có visual priority mạnh;
- learner’s work phải luôn là evidence;
- current bottleneck phải dominate;
- strength và supporting metrics phải recede;
- evidence quan trọng phải connect trực quan tới writing;
- không expose mọi analysis dimension cùng lúc;
- dùng progressive disclosure.

Review phải tạo cảm giác:

> “Hệ thống này hiểu bài viết của mình.”

Không phải:

> “Phần mềm này vừa generate analytics report.”

---

# 23. VISUAL QA — REFERENCE CALIBRATION

Trước khi báo major screen hoàn thành, so render với approved reference images.

**Không so literal layout.**

Chấm từng mục từ **0 đến 2**:

```text
0 = missing / poor
1 = acceptable
2 = strong
```

### A. Contrast
Primary hierarchy có rõ ngay không?

### B. Focal point
Có một visual focal point rõ không?

### C. Depth
Important surface có physically separated không?

### D. Material
Raised object có solid, matte, tactile không?

### E. Editorial hierarchy
Main statement có mạnh hơn support text rõ rệt không?

### F. Negative space
Composition có breathing room mà không empty không?

### G. Accent discipline
Accent có ít và meaningful không?

### H. Surface hierarchy
Canvas / section / raised object / control có phân biệt nhanh được không?

### I. Craft
Micro-detail có intentional hơn default-framework không?

### J. Product coherence
Có còn là BECOMING, không phải reference copy không?

Maximum: **20**

### Visual completion threshold

```text
17–20  Strong alignment
14–16  Acceptable but should polish
10–13  Not visually complete
<10    Rework required
```

Không được báo visually complete nếu:

- total < 14;
- Contrast = 0;
- Focal point = 0;
- Depth = 0;
- Product coherence = 0.

---

# 24. REQUIRED SELF-CRITIQUE LOOP

Major UI work không được dừng sau first render.

Required loop:

```text
Implement
↓
Render
↓
Capture / inspect
↓
Run Visual QA
↓
Identify top 3 visual gaps
↓
Refine
↓
Render again
↓
Run Visual QA again
```

Ít nhất **1 visual refinement pass** cho:

- newly designed major screen;
- major redesign/polish;
- new hero component;
- Journey/Home/Review/Mastery screen.

Không endless iterate vì pixel nhỏ.

---

# 25. VISUAL DEFECT PRIORITY

Sửa theo thứ tự:

1. wrong information hierarchy;
2. missing focal point;
3. insufficient tonal contrast;
4. flat / unclear surface depth;
5. excessive same-weight cards;
6. spacing / alignment;
7. typography refinement;
8. accent discipline;
9. micro-interaction;
10. decorative polish.

Không polish shadow khi information hierarchy còn sai.

---

# 26. ROOT-CAUSE VISUAL REFACTOR RULE

Nếu nhiều visual issue cùng xuất phát từ:

- token;
- shared component;
- layout primitive;
- surface component;
- elevation system;
- color system;
- typography system;

hãy sửa shared cause trước.

Không tích lũy page-specific CSS patch.

Tránh:

```css
margin-top: 13px;
box-shadow: ...; /* unique screen-only shadow */
!important;
```

trừ khi có lý do được ghi rõ.

---

# 27. DEFAULT IMPLEMENTATION PRIORITY

Khi screen quá flat hoặc low-contrast, không lập tức thêm decorative 3D artwork.

Ưu tiên:

```text
1. canvas/surface tonal separation
2. primary text contrast
3. hero hierarchy
4. material edge
5. ambient + contact shadow
6. accent discipline
7. micro-detail
8. optional 3D illustration only if useful
```

UI surface tự thân phải mang visual identity.

---

# 28. DO NOT COPY THE REFERENCE INTO APP STRUCTURE

WellX images là marketing composition.
BECOMING là interactive product.

Vì vậy phải giữ:

- usable navigation;
- accessible interaction;
- responsive behavior;
- information architecture;
- user task clarity.

Lấy **visual confidence** của poster, không lấy **interaction architecture** của poster.

---

# 29. ACCESSIBILITY OVERRIDES AESTHETICS

Reference alignment không được làm giảm:

- text readability;
- contrast accessibility;
- keyboard focus clarity;
- touch target size;
- Chinese/CJK readability;
- responsive usability.

Depth phải subtle đủ để không che content.

---

# 30. AGENT ENFORCEMENT BLOCK

Dùng block này như instruction bắt buộc:

```text
BECOMING VISUAL ALIGNMENT ENFORCEMENT

You must preserve the existing BECOMING product philosophy while moving
visual execution closer to the approved reference quality.

The target is NOT literal visual copying.

Match the references in:
- contrast strength
- editorial confidence
- tactile material
- surface separation
- physical depth
- negative space
- focal-point clarity
- restrained accent usage
- crafted micro-detail

Before coding:
1. Identify the dominant idea.
2. Identify the hero surface/object.
3. Define canvas → section → raised surface → control hierarchy.
4. Decide whether the screen should be light-first or focus-dark.
5. Identify the minimum use of accent color.

While implementing:
- reuse depth tokens;
- reuse radius/tone tokens;
- use tonal separation before borders;
- use ambient + contact shadow for important raised objects;
- avoid equal-weight card grids;
- avoid flat generic SaaS styling;
- avoid dark-on-dark low-contrast stacking.

After first render:
- run the 20-point Visual QA score;
- identify the three largest gaps;
- perform one focused refinement pass;
- render and score again.

Do not report visual completion below the acceptance threshold.
```

---

# 31. VISUAL COMPLETION REPORT

Major UI task phải report:

```text
VISUAL QA
Contrast: X/2
Focal point: X/2
Depth: X/2
Material: X/2
Editorial hierarchy: X/2
Negative space: X/2
Accent discipline: X/2
Surface hierarchy: X/2
Craft: X/2
BECOMING coherence: X/2

Total: XX/20

Main improvements:
- ...
- ...
- ...

Remaining visual risks:
- ...
```

Không thay thế functional QA.

---

# 32. FINAL VISUAL PRINCIPLE

> **A BECOMING screen should feel composed, not assembled.**

> **Important objects should feel present, not merely bordered.**

> **Intelligence should be visible through hierarchy and relevance, not through “AI styling.”**

> **Depth should make meaning tangible, not make the interface decorative.**

> **The references define the expected level of visual confidence, not a template to copy.**

---

## Installation note

Recommended structure:

```text
docs/
├── BECOMING_UIUX_SKILL.md
├── BECOMING_DESIGN_TOKENS.json
└── BECOMING_VISUAL_REFERENCE_ALIGNMENT_ADDENDUM.md
```

Thêm instruction này vào bootstrap/agent file:

```text
For all UI/UX implementation, read and obey:
1. BECOMING_UIUX_SKILL.md
2. BECOMING_DESIGN_TOKENS.json
3. BECOMING_VISUAL_REFERENCE_ALIGNMENT_ADDENDUM.md

The addendum supplements the existing skill and has priority for
contrast, depth, material, visual composition and reference calibration.
Do not rewrite the original design philosophy.
```
