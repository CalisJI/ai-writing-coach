import assert from 'node:assert/strict';
import fs from 'node:fs';

const profile=fs.readFileSync(new URL('../static/becoming/screens/profile.js',import.meta.url),'utf8');
const styles=fs.readFileSync(new URL('../static/becoming/orena/profile.css',import.meta.url),'utf8');
const icons=fs.readFileSync(new URL('../static/becoming/orena/icons.js',import.meta.url),'utf8');
const selectField=fs.readFileSync(new URL('../static/becoming/components/select-field.js',import.meta.url),'utf8');
const i18n=fs.readFileSync(new URL('../static/becoming/domain/i18n.js',import.meta.url),'utf8');
const template=fs.readFileSync(new URL('../templates/becoming/index.html',import.meta.url),'utf8');
const version=fs.readFileSync(new URL('../BECOMING_FRONTEND_VERSION',import.meta.url),'utf8').trim();

assert.equal(version,'2.17.5');
assert.match(template,/orena\/profile\.css\?v=2\.17\.5/);

for(const contract of [
  'o-profile-panel',
  'o-profile-setting',
  'o-profile-about-card',
  'o-profile-account-row',
  'o-profile-growth',
]){
  assert.match(profile,new RegExp(contract),'Profile must render '+contract);
}

for(const control of [
  'profileLanguage',
  'profileNativeLanguage',
  'profileStyle',
  'profileGoal',
  'profilePinyin',
  'profileColorMode',
  'profileTheme',
]){
  assert.match(profile,new RegExp(control),'Profile must preserve '+control);
}

assert.match(
  profile,
  /goal:patch\.goal\?\?[\s\S]*style:patch\.style\?\?[\s\S]*pinyin:patch\.pinyin\?\?[\s\S]*native_language:patch\.native_language\?\?[\s\S]*theme_preset:patch\.theme_preset\?\?/,
  'Profile persistence must send the complete preference shape',
);
assert.match(profile,/api\.setLanguage\(next\)/);
assert.match(profile,/becoming:language-changed/);
assert.match(profile,/applyTheme\(event\.currentTarget\.value,\{persist:true\}\)/);
assert.match(profile,/data-orena-icon/);
assert.match(profile,/icon:`flag-\$\{value\}`/);
assert.doesNotMatch(profile,/ðŸ|â˜|LANGUAGE_FLAGS|SUPPORT_FLAGS/,'Profile labels must not depend on mojibake-prone glyphs');
assert.doesNotMatch(profile,/theme-choice-grid/,'Palette choice must use the same compact row geometry as other preferences');
assert.match(i18n,/vi:'Tiếng Việt'/,'Vietnamese locale label must remain valid UTF-8');
assert.match(i18n,/zh:'中文'/,'Chinese locale label must remain valid UTF-8');
assert.match(profile,/\{pinyin:event\.currentTarget\.checked\?'auto':'off'\}/);
assert.match(profile,/growthRankFrame\(rank\)/);
assert.match(profile,/oIcon\('sliders'\)/,'About Preferences must use the reference-aligned settings icon');
assert.match(icons,/sliders:\s*`<svg/,'Shared icon set must expose the settings sliders icon');
assert.doesNotMatch(profile,/delete account/i,'Profile must not invent an unsupported destructive account action');

for(const selector of [
  '.o-profile{',
  '.o-profile-panel',
  '.o-profile-setting{',
  '.o-profile-about-card{',
  '.o-switch{',
]){
  assert.ok(styles.includes(selector),'Profile stylesheet must define '+selector);
}
assert.match(styles,/grid-template-columns:minmax\(0,830px\) minmax\(260px,294px\)/);
assert.match(styles,/width:min\(calc\(100% - 52px\),1152px\)/,'Desktop Profile must preserve the reference gutter and balanced two-column width');
assert.match(styles,/\.profile-layout\{[\s\S]*?gap:26px/,'Desktop Profile columns must keep the reference gap');
assert.match(styles,/--o-profile-control-track:minmax\(190px,220px\)/);
assert.match(styles,/grid-template-columns:minmax\(0,1fr\) var\(--o-profile-control-track\)/);
for(const icon of ['flag-en','flag-zh','flag-vi'])assert.match(styles,new RegExp(`data-icon="${icon}"`));
assert.match(selectField,/option\?\.dataset\?\.orenaIcon/);
assert.match(selectField,/orena-select-option-icon/);
assert.match(styles,/@media\(max-width:720px\)[\s\S]*\.o-profile-section-body\{[\s\S]*border:1px solid var\(--o-border\)/);
assert.match(styles,/@media\(max-width:720px\)[\s\S]*width:calc\(100% - 24px\)/,'Mobile Profile cards must retain a balanced outer gutter');
assert.match(styles,/@media\(max-width:720px\)[\s\S]*\.orena-select-panel\{[\s\S]*left:auto;[\s\S]*right:0;[\s\S]*max-width:calc\(100vw - 32px\)/,'Mobile listboxes must stay inside the viewport');
assert.match(styles,/\.o-profile-about-icon svg\{[\s\S]*stroke:currentColor/,'Profile illustration icon must render as a visible stroke icon');
assert.match(styles,/\.o-profile-about-card>ul svg\{[\s\S]*stroke:currentColor/,'Profile reassurance checks must render visibly');
assert.match(styles,/\.o-workspace:has\(#mainContent\[data-screen-contract="profile"\]\) \.o-topbar-title/,'Mobile Profile must promote the route title into the top bar');
assert.match(styles,/\.o-workspace:has\(#mainContent\[data-screen-contract="profile"\]\) \.o-topbar-actions\{[\s\S]*?margin-left:auto/,'Mobile Profile actions must remain anchored to the right edge');
assert.match(styles,/prefers-reduced-motion:reduce/);
assert.doesNotMatch(styles,/#[0-9a-f]{3,8}\b/i,'Profile must consume shared Orena colour tokens');

for(const key of [
  'profile.section_learning',
  'profile.section_experience',
  'profile.section_appearance',
  'profile.section_account',
  'profile.about_title',
  'profile.about_safe',
]){
  const occurrences=i18n.match(new RegExp("'"+key.replaceAll('.','\\.')+"'",'g'))||[];
  assert.equal(occurrences.length,3,key+' must have EN/VI/ZH copy');
}

console.log('Orena Profile visual and interaction contracts passed');
