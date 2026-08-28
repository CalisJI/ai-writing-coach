import assert from 'node:assert/strict';
import fs from 'node:fs';

const profile=fs.readFileSync(new URL('../static/becoming/screens/profile.js',import.meta.url),'utf8');
const styles=fs.readFileSync(new URL('../static/becoming/orena/profile.css',import.meta.url),'utf8');
const icons=fs.readFileSync(new URL('../static/becoming/orena/icons.js',import.meta.url),'utf8');
const selectField=fs.readFileSync(new URL('../static/becoming/components/select-field.js',import.meta.url),'utf8');
const i18n=fs.readFileSync(new URL('../static/becoming/domain/i18n.js',import.meta.url),'utf8');
const shell=fs.readFileSync(new URL('../static/becoming/orena/shell.css',import.meta.url),'utf8');
const template=fs.readFileSync(new URL('../templates/becoming/index.html',import.meta.url),'utf8');
const version=fs.readFileSync(new URL('../BECOMING_FRONTEND_VERSION',import.meta.url),'utf8').trim();

assert.equal(version,'2.17.5');
assert.match(template,/orena\/profile\.css\?v=2\.17\.5/);

for(const contract of [
  'o-prefs',
  'o-set',
  'o-set-group',
  'o-set-row',
  'o-about',
  'o-about-points',
  'o-quick-row',
]){
  assert.match(profile,new RegExp(contract),'Profile must render '+contract);
  assert.match(styles,new RegExp(contract),'Profile stylesheet must define '+contract);
}

for(const control of [
  'profileLanguage',
  'profileNativeLanguage',
  'profileStyle',
  'profileGoal',
  'profilePinyin',
  'profileMode',
  'profileTheme',
]){
  assert.match(profile,new RegExp(control),'Profile must preserve '+control);
}

assert.match(
  profile,
  /goal:patch\.goal\?\?[\s\S]*style:patch\.style\?\?[\s\S]*pinyin:patch\.pinyin\?\?[\s\S]*native_language:patch\.native_language\?\?[\s\S]*theme_preset:patch\.theme_preset\?\?/,
  'Profile persistence must send the complete preference shape',
);
assert.match(profile,/api\.setLanguage\(value\)/);
assert.match(profile,/becoming:language-changed/);
assert.match(profile,/const PINYIN_MODES=[\s\S]*'auto'[\s\S]*'on'[\s\S]*'off'/,'Pinyin must retain all three preference states');
assert.match(profile,/onChange\('profilePinyin',[\s\S]*persistProfile\(\{pinyin:value\}/);
assert.match(profile,/onChange\('profileMode',[\s\S]*applyTheme\(mode,\{persist:true\}\)/);
assert.match(profile,/input\[name="profileTheme"\]/);
assert.match(profile,/persistProfile\(\{theme_preset:input\.value\}/);
assert.match(profile,/restoreSelect\('profileLanguage',state\.language\)/,'A failed learning-language change must restore the truthful value');
assert.match(profile,/restoreSelect\('profilePinyin',previous\)/,'A failed Pinyin save must restore the truthful value');
assert.match(profile,/becoming:theme-changed/,'Profile theme control must follow changes made in shared chrome');

assert.match(profile,/const FLAGS=\{/);
for(const language of ['en','zh','vi'])assert.ok(profile.includes(language+':`<svg class="o-flag"'),'Missing drawn flag for '+language);
assert.doesNotMatch(profile,/Ã°Å¸|Ã¢Ëœ|LANGUAGE_FLAGS|SUPPORT_FLAGS/,'Profile labels must not depend on mojibake-prone glyphs');
assert.match(profile,/data-icon=/,'Profile controls must opt into the shared explicit-icon slot');
assert.match(selectField,/select\.dataset\.icon/);
assert.match(selectField,/controlIcon/);
assert.match(selectField,/option\?\.dataset\?\.orenaIcon/);
assert.match(selectField,/orena-select-option-icon/);
assert.match(selectField,/aria-activedescendant/);

assert.match(profile,/growthRankFrame\(rank\)/);
assert.match(profile,/oIcon\('sliders'\)/,'About Preferences must use the shared settings icon');
assert.match(icons,/sliders:\s*`<svg/,'Shared icon set must expose the settings sliders icon');
assert.doesNotMatch(profile,/data-profile-action="delete-account"|api\.deleteAccount/,'Profile must not expose an unsupported destructive account action');
assert.match(profile,/api\.productMe\(\)/,'Profile must load canonical account state');
assert.match(profile,/accountPlanMarkup\(accountState\)/,'Profile must render account state rather than a marketing-only plan label');
for(const key of ['profile.plan_unavailable','profile.plan_default','profile.plan_active','profile.plan_unknown','profile.unlimited','profile.exhausted','profile.usage_unavailable']){
  assert.ok(i18n.includes("'"+key+"'"),key+' must remain localized');
}

assert.match(styles,/\.o-prefs\{[\s\S]*grid-template-columns:minmax\(0,1fr\) var\(--o-aside-w\)[\s\S]*gap:24px/);
assert.match(styles,/\.o-set-row\{[\s\S]*grid-template-columns:minmax\(0,1fr\) minmax\(0,auto\)/);
assert.match(styles,/\.profile-page \.theme-choice-grid\{[\s\S]*grid-template-columns:repeat\(auto-fit,minmax\(170px,1fr\)\)/);
assert.match(styles,/@media \(max-width:1023px\)[\s\S]*\.o-set-body\{[\s\S]*border:1px solid var\(--o-border\)/,'Tablet/mobile groups must remain bounded surfaces');
assert.match(styles,/@media \(max-width:520px\)[\s\S]*\.o-set-row\{[\s\S]*grid-template-columns:minmax\(0,1fr\)/,'Phone settings must recompose to one column');
assert.match(styles,/@media \(max-width:520px\)[\s\S]*\.o-set-control \.orena-select-panel\{[\s\S]*right:0[\s\S]*max-width:calc\(100vw - 32px\)/,'Phone listboxes must stay inside the viewport');
assert.match(styles,/\.o-workspace:has\(#mainContent\[data-screen-contract="profile"\]\) \.o-topbar-title/,'Phone Profile must promote the route title into shared chrome');
assert.match(styles,/\.o-about-tile svg\{[\s\S]*stroke:currentColor/,'Profile illustration icon must remain visible');
assert.match(styles,/\.o-about-points svg\{[\s\S]*stroke:var\(--o-accent\)/,'Profile reassurance checks must remain visible');
assert.doesNotMatch(styles,/#[0-9a-f]{3,8}\b/i,'Profile stylesheet must consume shared Orena colour tokens');
assert.match(shell,/prefers-reduced-motion:reduce/,'Shared Orena shell must suppress motion for Profile');

for(const key of [
  'profile.learning_language',
  'profile.interface_language',
  'profile.guidance_style',
  'profile.current_goal',
  'profile.pinyin',
]){
  assert.ok(i18n.includes("'"+key+"'"),key+' must remain localized');
}

console.log('Orena Profile visual and interaction contracts passed');
