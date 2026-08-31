from __future__ import annotations
from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]
errors=[]

def require(cond,msg):
    if not cond:
        errors.append(msg)

css=ROOT/'static'/'becoming'/'layout-repair-v2154.css'
js=ROOT/'static'/'becoming'/'layout-repair-v2154.js'
tpl=ROOT/'templates'/'becoming'/'index.html'
ver=ROOT/'BECOMING_FRONTEND_VERSION'

for p in (css,js,tpl,ver):
    require(p.exists(),f'Missing {p.relative_to(ROOT)}')

if not errors:
    c=css.read_text(encoding='utf-8')
    j=js.read_text(encoding='utf-8')
    h=tpl.read_text(encoding='utf-8')
    v=ver.read_text(encoding='utf-8').strip()

    require(v=='2.15.4','Frontend version must be 2.15.4')

    for token in [
        '--bc154-page-gutter','--bc154-section-gap',
        '--bc154-card-pad-x','--bc154-card-pad-y',
        '.bc154-layout-card.bc154-pad-x.bc154-pad-x',
        '.bc154-card-content-child',
        '.bc154-section-stack',
        '.bc154-page-shell'
    ]:
        require(token in c,f'Missing CSS contract: {token}')

    for token in [
        'installLayoutRepairV2154',
        'STRUCTURAL_SURFACE_SELECTOR',
        "'form'","'fieldset'","'ul'","'ol'","'dl'",
        'candidateSurfaces',
        'repairCardContentBoxes',
        'markCards',
        'markSectionStacks',
        'enforceContainment',
        'clearLegacyClasses'
    ]:
        require(token in j,f'Missing runtime contract: {token}')

    for pattern,msg in [
        (r'\b(?:width|inline-size)\s*:\s*100vw\b','100vw width is forbidden'),
        (r'!important','!important is forbidden'),
        (r'transform\s*:\s*translateX','translateX patch is forbidden'),
        (r'margin-(?:left|right)\s*:\s*-\d','negative horizontal margin CSS patch is forbidden'),
    ]:
        require(re.search(pattern,c,re.I) is None,msg)

    require('/becoming-assets/layout-repair-v2154.css?v=2.15.4' in h,
            'Canonical template missing v2.15.4 CSS')
    require('/becoming-assets/layout-repair-v2154.js?v=2.15.4' in h,
            'Canonical template missing v2.15.4 JS')
    require('installLayoutRepairV2154' in h,
            'Canonical template missing runtime install')

    for old in [
        'layout-repair-v2153.css','layout-repair-v2153.js',
        'layout-repair-v2152.css','layout-repair-v2152.js',
        'layout-system-v215.css','layout-system-v2151.css',
        'layout-system-v215.js','layout-system-v2151.js'
    ]:
        require(old not in h,f'Old layout layer still loaded: {old}')

if errors:
    print('BECOMING v2.15.4 LAYOUT REPAIR validation FAILED')
    for e in errors:
        print(' -',e)
    raise SystemExit(1)

print('BECOMING v2.15.4 LAYOUT REPAIR validation OK')
print('Structural surface discovery includes form/list containers; shared padding/content-box contracts present')
