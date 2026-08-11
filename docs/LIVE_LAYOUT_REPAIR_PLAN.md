# BECOMING v2.15.1 — PAGE GEOMETRY REPAIR

Required hierarchy:

```text
workspace
→ external gutter
→ route/page root
→ section/card internal padding
```

Shared outer geometry:

```css
inline-size: calc(100% - (2 * var(--bc151-page-gutter)));
max-inline-size: 1400px;
margin-inline: auto;
padding-inline: 0;
```

The r2 installer verifies source, served assets, served `/becoming` HTML,
regression gates and Git hygiene. It contains no browser screenshot workflow.
