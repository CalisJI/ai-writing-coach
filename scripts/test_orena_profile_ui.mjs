import assert from 'node:assert/strict';
import fs from 'node:fs';

const profile=fs.readFileSync(new URL('../static/becoming/screens/profile.js',import.meta.url),'utf8');
const styles=fs.readFileSync(new URL('../static/becoming/orena/profile.css',import.meta.url),'utf8');
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
assert.match(profile,/\{pinyin:event\.currentTarget\.checked\?'auto':'off'\}/);
assert.match(profile,/growthRankFrame\(rank\)/);
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
assert.match(styles,/@media\(max-width:720px\)[\s\S]*\.o-profile-section-body\{[\s\S]*border:1px solid var\(--o-border\)/);
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
