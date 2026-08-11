from __future__ import annotations
from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]
errors=[]

def require(cond,msg):
    if not cond: errors.append(msg)

css=ROOT/'static'/'becoming'/'layout-repair-v2153.css'
js=ROOT/'static'/'becoming'/'layout-repair-v2153.js'
tpl=ROOT/'templates'/'becoming'/'index.html'
ver=ROOT/'BECOMING_FRONTEND_VERSION'

for p in (css,js,tpl,ver):
    require(p.exists(),f'Missing {p.relative_to(ROOT)}')

if not errors:
    c=css.read_text(encoding='utf-8')
    j=js.read_text(encoding='utf-8')
    h=tpl.read_text(encoding='utf-8')
    v=ver.read_text(encoding='utf-8').strip()

    require(v=='2.15.3','Frontend version must be 2.15.3')
    for token in [
        '--bc153-page-gutter','--bc153-section-gap','--bc153-card-pad-x',
        '.bc153-layout-card.bc153-pad-x','.bc153-card-content-child',
        '.bc153-section-stack','.bc153-page-shell'
    ]:
        require(token in c,f'Missing CSS contract: {token}')

    for token in [
        'installLayoutRepairV2153','repairCardContentBoxes','surfaceLike',
        'markCards','markSectionStacks','enforceContainment','clearLegacyClasses'
    ]:
        require(token in j,f'Missing runtime contract: {token}')

    for pattern,msg in [
        (r'\b(?:width|inline-size)\s*:\s*100vw\b','100vw width is forbidden'),
        (r'!important','!important is forbidden'),
        (r'transform\s*:\s*translateX','translateX patch is forbidden'),
        (r'margin-(?:left|right)\s*:\s*-\d','negative horizontal margin CSS patch is forbidden'),
    ]:
        require(re.search(pattern,c,re.I) is None,msg)

    require('/becoming-assets/layout-repair-v2153.css?v=2.15.3' in h,
            'Canonical template missing v2.15.3 CSS')
    require('/becoming-assets/layout-repair-v2153.js?v=2.15.3' in h,
            'Canonical template missing v2.15.3 JS')
    require('installLayoutRepairV2153' in h,'Canonical template missing runtime install')

    for old in ['layout-repair-v2152.css','layout-repair-v2152.js',
                'layout-system-v215.css','layout-system-v2151.css',
                'layout-system-v215.js','layout-system-v2151.js']:
        require(old not in h,f'Old layout layer still loaded: {old}')

if errors:
    print('BECOMING v2.15.3 LAYOUT REPAIR validation FAILED')
    for e in errors: print(' -',e)
    raise SystemExit(1)

print('BECOMING v2.15.3 LAYOUT REPAIR validation OK')
print('Card content-box invariant + shared padding + section/page contracts present')
