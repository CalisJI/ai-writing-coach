# BECOMING v2.15 — PAGE GUTTER / CONTENT CONTAINER PLAN

Prepared before implementation.

## 1. Root cause

The remaining alignment problem belongs to the page/layout layer, not card surfaces.

The current UI has accumulated route-specific composition rules over multiple releases. Major sections can therefore inherit different combinations of:

- page padding;
- route root padding;
- max-width;
- width: 100%;
- width: 100vw;
- local margin-inline:auto;
- grid gaps;
- section wrappers.

A card cannot reliably correct this because a card owns:
- internal padding;
- radius;
- material;
- shadow.

It must not own the viewport/page gutter.

## 2. Required hierarchy

```text
APP SHELL
├── learner rail / mobile navigation
└── MAIN WORKSPACE
    └── PAGE CONTAINER
        ├── page headline / hero
        ├── major section
        ├── major section
        └── major section
```

## 3. New shared layout contract

One root primitive:

```text
.bc15-page-container
```

One shared token family:

```text
--bc15-content-max
--bc15-page-gutter
--bc15-section-gap
--bc15-column-gap
```

The page container owns:

```text
width
max-width
margin-inline
horizontal gutter
box sizing
horizontal containment
```

Major cards/surfaces do not create page gutters.

## 4. Responsive gutter

The same token is used by every learner route.

```text
>= 1440 : 40px
1280–1439: 32px
1024–1279: 28px
768–1023 : 24px
< 768    : 18px
<= 420   : 16px
```

This stays inside the requested ranges and does not vary by page.

## 5. Content max width

Large learner pages are centered and bounded.

```text
--bc15-content-max: 1480px
```

This is the outer page-container maximum including the page's own horizontal gutter.

The usable inner content therefore remains bounded and centered on very wide displays.

## 6. Two-column contract

Known major two-column compositions share one:

```text
--bc15-column-gap
```

Children receive:

```text
min-width: 0
max-width: 100%
```

so long content cannot force a column beyond the page container.

Existing page-specific column ratios are preserved.

## 7. Full-bleed policy

No learner section becomes full-bleed by default.

Direct children of the page container are capped with:

```text
max-inline-size: 100%
```

This neutralizes accidental `100vw` overflow without changing intentional narrower widths.

## 8. Regression targets

Validate:

```text
1440
1280
1024
768
390
```

At every width:

- page gutter > 0;
- no horizontal document overflow;
- page container <= viewport;
- major direct children <= page container;
- representative major sections share the same left/right edge;
- two-column children remain inside the container;
- mobile gutter remains present.
