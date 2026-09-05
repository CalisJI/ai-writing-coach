import assert from 'node:assert/strict';
import {libraryLessonCard} from '../static/becoming/screens/listening.js';

const lesson = (over = {}) => ({
  lesson_id: 'en-science-cosmic-calendar', media_object_id: 'asset-1',
  title: 'The cosmic calendar',
  description: 'A long editorial description that must not dominate the card, per spec 3.3.',
  language: 'en', topic: 'science', subtopics: [], level: 'B2',
  estimated_level: 'B2', reviewed_level: null, level_source: 'deterministic-estimate',
  level_evidence: {vocabulary_band: 'academic'}, duration_ms: 46000,
  available_modes: ['listen', 'active', 'dictation', 'shadowing'],
  content_tags: ['science', 'documentary', 'narration', 'real-video', 'extra-tag'],
  artwork: 'science', playback_kind: 'video',
  poster_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/x.webm/960px--x.webm.jpg',
  source: {provider: 'wikimedia-commons', creator: 'The Royal Society',
    license: 'CC BY 3.0', rights_review_status: 'verified'},
  ...over,
});

const seedAudio = lesson({
  lesson_id: 'en-daily-pen-in-my-bag', title: 'A pen in my bag', topic: 'daily-life',
  level: 'A1', duration_ms: 8547, playback_kind: 'audio', poster_url: '',
  content_tags: ['conversation'], artwork: 'daily-life',
  source: {provider: 'wikimedia-commons', creator: 'VOA Learning English'},
});

const html = libraryLessonCard(lesson());
const firstCard = html;
const audioCard = libraryLessonCard(seedAudio);

// --- 3.1: the poster is the primary object, first inside the card ---
assert.match(html, /class="o-card listening-library-card has-poster"/, 'a poster-backed lesson is marked as such');
const mediaAt = html.indexOf('listening-card-media');
const bodyAt = html.indexOf('listening-card-body');
assert.ok(mediaAt > -1 && bodyAt > mediaAt, 'the media block precedes the text block');
assert.match(html, /<img src="https:\/\/upload\.wikimedia\.org\/[^"]+" alt="" loading="lazy"/, 'the real poster renders');

// --- 3.2: level, duration, provider, title, tags, modes, one start action ---
assert.match(html, /listening-card-level[^>]*>B2</, 'level badge');
assert.match(html, /listening-card-duration">0:46</, 'duration badge');
assert.match(html, /listening-card-provider">Video · The Royal Society</, 'provider badge names the kind and creator');
assert.match(html, /listening-card-open" data-library-lesson="en-science-cosmic-calendar"[^>]*>The cosmic calendar</, 'title is the start control');

// --- 3.3: the card is not dominated by description, rights or full metadata ---
assert.doesNotMatch(html, /A long editorial description/, 'the description belongs in lesson detail, not the card');
assert.doesNotMatch(html, /CC BY 3\.0/, 'rights text must not appear on the card');
assert.doesNotMatch(html, /academic/, 'level evidence must not appear on the card');
assert.doesNotMatch(html, /listening-library-source/, 'the full source line is gone');
assert.equal((firstCard.match(/listening-library-tags"[\s\S]*?<\/div>/) || [''])[0].split('#').length - 1, 3,
  'at most three tags, not every tag');

// --- 3.23: seed audio and real media are distinguishable ---
assert.match(audioCard, /listening-card-provider">Audio · VOA Learning English</, 'seed audio is labelled Audio');
assert.match(audioCard, /listening-card-fallback/, 'a lesson without a poster still gets artwork');
assert.doesNotMatch(audioCard, /has-poster/, 'a lesson with no poster is not marked as poster-backed');

// --- One control per card, so the poster is clickable without a duplicate ---
assert.equal((firstCard.match(/<button/g) || []).length, 1, 'exactly one control per card');

console.log('LISTENING_DISCOVERY_CONTRACT=PASS');
