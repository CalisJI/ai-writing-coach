from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]
STATIC=ROOT/'static'/'becoming'
errors=[]

def require(condition,message):
    if not condition:
        errors.append(message)

def read(rel):
    return (ROOT/rel).read_text(encoding='utf-8')

required=[
    ROOT/'app.py',
    ROOT/'templates'/'becoming'/'index.html',
    STATIC/'visual-alignment.css',
    STATIC/'domain'/'i18n.js',
    STATIC/'domain'/'screen-contract.js',
    STATIC/'screens'/'home.js',
    STATIC/'screens'/'write.js',
    STATIC/'screens'/'review.js',
    STATIC/'screens'/'reading.js',
    STATIC/'screens'/'library.js',
    STATIC/'screens'/'journey.js',
    STATIC/'screens'/'profile.js',
    ROOT/'BECOMING_FRONTEND_VERSION',
]
for path in required:
    require(path.exists(),f'Missing {path.relative_to(ROOT)}')

if not errors:
    app=read('app.py')
    template=read('templates/becoming/index.html')
    visual=read('static/becoming/visual-alignment.css')
    i18n=read('static/becoming/domain/i18n.js')
    contract=read('static/becoming/domain/screen-contract.js')
    home=read('static/becoming/screens/home.js')
    version=read('BECOMING_FRONTEND_VERSION').strip()

    require(version=='2.9.0','BECOMING_FRONTEND_VERSION must be 2.9.0')
    require('SCHEMA_VERSION = 11' in app,'canonical UI release must not change schema 11')
    require('/becoming-assets/app.js?v=2.9.0' in template,'app.js 2.9.0 cache marker missing')
    require('/becoming-assets/visual-alignment.css?v=2.9.0' in template,'visual-alignment.css 2.9.0 marker missing')
    require('?v=2.8.0' not in template and '?v=2.7.3' not in template,'stale frontend cache marker remains')

    # Same IA, new shell placement.
    nav=re.findall(r'data-route="([a-z_-]+)"',template)
    require(nav==['home','write','read','library','journey','profile'],f'navigation IA changed unexpectedly: {nav}')
    for needle in ['class="app-sidebar"','class="app-workspace"','class="nav-icon"','class="sidebar-footer"']:
        require(needle in template,f'canonical shell missing: {needle}')
    require('data-i18n-label' in template,'navigation labels are not i18n-safe with icons')
    require("node.querySelector('[data-i18n-label]')" in i18n,'chrome i18n does not preserve nav icon markup')

    # Visual ground-truth grammar.
    for needle in [
        '--shell-sidebar-width:', '.app-sidebar{', '.app-workspace{',
        '.home-editorial-hero{', '.home-folio{', '.folio-spread{',
        '.home-journey-panel{', '.home-stage-track{', '.home-signal-rail{',
        '--visual-contact:', '--visual-ambient:', '--visual-top-highlight:',
        'html[data-theme="dark"][data-palette="editorial"]',
    ]:
        require(needle in visual,f'canonical visual grammar missing: {needle}')

    # Accent discipline: active/CTA/progress signal only in the Home composition.
    require('background:var(--color-accent-600)' in visual or 'var(--color-accent-600)' in visual,'orange accent signal missing')
    require('.home-stage.active .home-stage-object' in visual,'active journey stage lacks distinct accent treatment')
    require('.primary-nav a.active .nav-icon' in visual,'active navigation lacks constrained signal')

    # Learner work is the hero, not a fake analytics dashboard.
    for needle in ['currentWorkFolio', 'home-folio', 'home.current_piece', 'home-journey-panel', 'recentRows']:
        require(needle in home,f'Home learner-work composition missing: {needle}')
    for forbidden in ['Writing Streak','14 days','leaderboard','XP','fakeProgress']:
        require(forbidden not in home,f'Home introduced unsupported gamification/fake product data: {forbidden}')

    # Responsive continuation instead of desktop compression.
    require('@media(max-width:960px)' in visual,'sidebar-to-mobile continuation breakpoint missing')
    require('@media(max-width:680px)' in visual,'mobile composition breakpoint missing')
    require('.folio-right,\n  .folio-gutter{display:none}' in visual,'mobile folio does not simplify to the learner work page')

    # Screen philosophy remains enforceable.
    for field in ['learnerGoal:','dominantIdea:','primaryAction:','progressiveDisclosure:','evidence:','visualHero:','surfaceHierarchy:','themeBias:','accentPolicy:']:
        require(field in contract,f'screen contract missing: {field}')
    require("visualHero:'Current learner-work folio" in contract,'Home contract does not identify learner work as visual hero')

    # Visual-only patch; no provider/business changes.
    joined=(visual+home+contract).lower()
    for forbidden in ['/api/chat','ollama_url','requests.','schema_version = 12']:
        require(forbidden not in joined,f'canonical UI layer contains forbidden business/provider concept: {forbidden}')

if errors:
    print('BECOMING v2.9 canonical UI validation FAILED')
    for item in errors:
        print(' -',item)
    raise SystemExit(1)

print('BECOMING v2.9 canonical UI validation OK')
print('Sidebar shell + learner-work hero + tactile journey + dark parity + i18n-safe chrome + responsive continuation present')
