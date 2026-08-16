# Orena Grammar System Audit

Status: **PHASE 1 + PHASE 2 AUDIT COMPLETE / CONTENT MIGRATION BLOCKED**

This report is intentionally conservative. `PASS_CANDIDATE` means the lesson
survived static heuristics; it is NOT a claim of linguistic/editorial approval.

## System inventory

- Registered language codes detected: `en, zh`
- Grammar language directories: `chinese, english`
- Interface locales detected: `en, vi, zh`
- Grammar-related files: **47**
- Total Grammar entries audited: **508**

### HARD GATE — registered languages without Grammar content directory

- `en`
- `zh`

## Language inventory

### chinese

- Levels: `HSK1, HSK2, HSK3, HSK4, HSK5, HSK6, HSK7-9`
- Total lessons: **239**
- Static PASS candidates: **0**
- Pending content: **239**
- Generic/placeholder signals: **239**
- Missing actual representation: **0**
- Missing examples: **0**
- Missing practice: **0**
- Review/checkpoint-like items: **43**
- Review without real structures: **43**
- Content statuses: `{"foundation": 239}`

Per level:

| Level | Total | PASS candidate | Pending | Generic | No representation | No examples | No practice |
|---|---:|---:|---:|---:|---:|---:|---:|
| HSK1 | 25 | 0 | 25 | 25 | 0 | 0 | 0 |
| HSK2 | 29 | 0 | 29 | 29 | 0 | 0 | 0 |
| HSK3 | 29 | 0 | 29 | 29 | 0 | 0 | 0 |
| HSK4 | 34 | 0 | 34 | 34 | 0 | 0 | 0 |
| HSK5 | 39 | 0 | 39 | 39 | 0 | 0 | 0 |
| HSK6 | 46 | 0 | 46 | 46 | 0 | 0 | 0 |
| HSK7-9 | 37 | 0 | 37 | 37 | 0 | 0 | 0 |


### english

- Levels: `A1, A2, B1, B2, C1, C2`
- Total lessons: **269**
- Static PASS candidates: **0**
- Pending content: **269**
- Generic/placeholder signals: **269**
- Missing actual representation: **0**
- Missing examples: **0**
- Missing practice: **0**
- Review/checkpoint-like items: **41**
- Review without real structures: **41**
- Content statuses: `{"foundation": 266, "curated": 3}`

Per level:

| Level | Total | PASS candidate | Pending | Generic | No representation | No examples | No practice |
|---|---:|---:|---:|---:|---:|---:|---:|
| A1 | 30 | 0 | 30 | 29 | 0 | 0 | 0 |
| A2 | 38 | 0 | 38 | 37 | 0 | 0 | 0 |
| B1 | 59 | 0 | 59 | 58 | 0 | 0 | 0 |
| B2 | 60 | 0 | 60 | 60 | 0 | 0 | 0 |
| C1 | 45 | 0 | 45 | 45 | 0 | 0 | 0 |
| C2 | 37 | 0 | 37 | 37 | 0 | 0 | 0 |


## Hard content audit

- Hard placeholder test failed: **508**
- Generic instructional copy detected: **505**
- Missing actual grammar representation: **0**
- Missing examples: **0**
- Missing practice: **0**

## Duplicate-content audit

- Exact cross-lesson duplicate groups: **186**

Top suspicious duplicate groups:

- `52f64a9e649c08db` — **508 lessons**
  - Text: `sau khi học hãy dùng lại target này trong writing thật và lưu occurrence để orena theo dõi transfer.`
  - IDs: `chinese:zh-hsk1-1-svo-c-b-n, chinese:zh-hsk1-10-v, chinese:zh-hsk1-11-v, chinese:zh-hsk1-12-t-h-i-gi-nguy-n-v-tr, chinese:zh-hsk1-13-c-u-h-i-ch-nh-ph-n, chinese:zh-hsk1-14-v-c-u-t-nh-t, chinese:zh-hsk1-15-topic, chinese:zh-hsk1-16-ho-n-th-nh-c-b-n, chinese:zh-hsk1-17-th-i-gian-v-ng-y-gi, chinese:zh-hsk1-18-c-b-n, chinese:zh-hsk1-19-v-tr-c-b-n, chinese:zh-hsk1-2-c-u-nh-danh, chinese:zh-hsk1-20-n-i-danh-t, chinese:zh-hsk1-3-s-h-u-v-t-n-t-i, chinese:zh-hsk1-4-v-tr, chinese:zh-hsk1-5-s-h-u-v-b-ngh-a ...`
- `2f869d9f232c4463` — **505 lessons**
  - Text: `grammar encodes meaning and relationships. a familiar form can still be wrong when the context or intended meaning changes.`
  - IDs: `chinese:zh-hsk1-1-svo-c-b-n, chinese:zh-hsk1-10-v, chinese:zh-hsk1-11-v, chinese:zh-hsk1-12-t-h-i-gi-nguy-n-v-tr, chinese:zh-hsk1-13-c-u-h-i-ch-nh-ph-n, chinese:zh-hsk1-14-v-c-u-t-nh-t, chinese:zh-hsk1-15-topic, chinese:zh-hsk1-16-ho-n-th-nh-c-b-n, chinese:zh-hsk1-17-th-i-gian-v-ng-y-gi, chinese:zh-hsk1-18-c-b-n, chinese:zh-hsk1-19-v-tr-c-b-n, chinese:zh-hsk1-2-c-u-nh-danh, chinese:zh-hsk1-20-n-i-danh-t, chinese:zh-hsk1-3-s-h-u-v-t-n-t-i, chinese:zh-hsk1-4-v-tr, chinese:zh-hsk1-5-s-h-u-v-b-ngh-a ...`
- `4a4abcb67a52eeae` — **505 lessons**
  - Text: `write one original target-language sentence that uses this grammar concept naturally. add a short reason for your choice.`
  - IDs: `chinese:zh-hsk1-1-svo-c-b-n, chinese:zh-hsk1-10-v, chinese:zh-hsk1-11-v, chinese:zh-hsk1-12-t-h-i-gi-nguy-n-v-tr, chinese:zh-hsk1-13-c-u-h-i-ch-nh-ph-n, chinese:zh-hsk1-14-v-c-u-t-nh-t, chinese:zh-hsk1-15-topic, chinese:zh-hsk1-16-ho-n-th-nh-c-b-n, chinese:zh-hsk1-17-th-i-gian-v-ng-y-gi, chinese:zh-hsk1-18-c-b-n, chinese:zh-hsk1-19-v-tr-c-b-n, chinese:zh-hsk1-2-c-u-nh-danh, chinese:zh-hsk1-20-n-i-danh-t, chinese:zh-hsk1-3-s-h-u-v-t-n-t-i, chinese:zh-hsk1-4-v-tr, chinese:zh-hsk1-5-s-h-u-v-b-ngh-a ...`
- `44746a5d89936ea6` — **505 lessons**
  - Text: `this grammar concept connects meaning sentence structure and context. learn the relationship before memorizing the form.`
  - IDs: `chinese:zh-hsk1-1-svo-c-b-n, chinese:zh-hsk1-10-v, chinese:zh-hsk1-11-v, chinese:zh-hsk1-12-t-h-i-gi-nguy-n-v-tr, chinese:zh-hsk1-13-c-u-h-i-ch-nh-ph-n, chinese:zh-hsk1-14-v-c-u-t-nh-t, chinese:zh-hsk1-15-topic, chinese:zh-hsk1-16-ho-n-th-nh-c-b-n, chinese:zh-hsk1-17-th-i-gian-v-ng-y-gi, chinese:zh-hsk1-18-c-b-n, chinese:zh-hsk1-19-v-tr-c-b-n, chinese:zh-hsk1-2-c-u-nh-danh, chinese:zh-hsk1-20-n-i-danh-t, chinese:zh-hsk1-3-s-h-u-v-t-n-t-i, chinese:zh-hsk1-4-v-tr, chinese:zh-hsk1-5-s-h-u-v-b-ngh-a ...`
- `ffd100ca8d5d1b80` — **505 lessons**
  - Text: `sắc thái trọng tâm thông tin góc nhìn thời gian trật tự từ hoặc lựa chọn từ vựng có thể làm thay đổi cấu trúc tự nhiên.`
  - IDs: `chinese:zh-hsk1-1-svo-c-b-n, chinese:zh-hsk1-10-v, chinese:zh-hsk1-11-v, chinese:zh-hsk1-12-t-h-i-gi-nguy-n-v-tr, chinese:zh-hsk1-13-c-u-h-i-ch-nh-ph-n, chinese:zh-hsk1-14-v-c-u-t-nh-t, chinese:zh-hsk1-15-topic, chinese:zh-hsk1-16-ho-n-th-nh-c-b-n, chinese:zh-hsk1-17-th-i-gian-v-ng-y-gi, chinese:zh-hsk1-18-c-b-n, chinese:zh-hsk1-19-v-tr-c-b-n, chinese:zh-hsk1-2-c-u-nh-danh, chinese:zh-hsk1-20-n-i-danh-t, chinese:zh-hsk1-3-s-h-u-v-t-n-t-i, chinese:zh-hsk1-4-v-tr, chinese:zh-hsk1-5-s-h-u-v-b-ngh-a ...`
- `821b17ede7d4678b` — **505 lessons**
  - Text: `when you hear the concept listen for the surrounding words and situation that make the grammar choice meaningful.`
  - IDs: `chinese:zh-hsk1-1-svo-c-b-n, chinese:zh-hsk1-10-v, chinese:zh-hsk1-11-v, chinese:zh-hsk1-12-t-h-i-gi-nguy-n-v-tr, chinese:zh-hsk1-13-c-u-h-i-ch-nh-ph-n, chinese:zh-hsk1-14-v-c-u-t-nh-t, chinese:zh-hsk1-15-topic, chinese:zh-hsk1-16-ho-n-th-nh-c-b-n, chinese:zh-hsk1-17-th-i-gian-v-ng-y-gi, chinese:zh-hsk1-18-c-b-n, chinese:zh-hsk1-19-v-tr-c-b-n, chinese:zh-hsk1-2-c-u-nh-danh, chinese:zh-hsk1-20-n-i-danh-t, chinese:zh-hsk1-3-s-h-u-v-t-n-t-i, chinese:zh-hsk1-4-v-tr, chinese:zh-hsk1-5-s-h-u-v-b-ngh-a ...`
- `693be0b9a06f6984` — **505 lessons**
  - Text: `ngữ pháp mã hóa ý nghĩa và quan hệ. một form quen thuộc vẫn có thể sai nếu ngữ cảnh hoặc ý định diễn đạt đã đổi.`
  - IDs: `chinese:zh-hsk1-1-svo-c-b-n, chinese:zh-hsk1-10-v, chinese:zh-hsk1-11-v, chinese:zh-hsk1-12-t-h-i-gi-nguy-n-v-tr, chinese:zh-hsk1-13-c-u-h-i-ch-nh-ph-n, chinese:zh-hsk1-14-v-c-u-t-nh-t, chinese:zh-hsk1-15-topic, chinese:zh-hsk1-16-ho-n-th-nh-c-b-n, chinese:zh-hsk1-17-th-i-gian-v-ng-y-gi, chinese:zh-hsk1-18-c-b-n, chinese:zh-hsk1-19-v-tr-c-b-n, chinese:zh-hsk1-2-c-u-nh-danh, chinese:zh-hsk1-20-n-i-danh-t, chinese:zh-hsk1-3-s-h-u-v-t-n-t-i, chinese:zh-hsk1-4-v-tr, chinese:zh-hsk1-5-s-h-u-v-b-ngh-a ...`
- `498eb0dfed4e08ab` — **505 lessons**
  - Text: `viết một câu nguyên bản bằng ngôn ngữ đích dùng điểm ngữ pháp này tự nhiên. ghi ngắn lý do bạn chọn cấu trúc đó.`
  - IDs: `chinese:zh-hsk1-1-svo-c-b-n, chinese:zh-hsk1-10-v, chinese:zh-hsk1-11-v, chinese:zh-hsk1-12-t-h-i-gi-nguy-n-v-tr, chinese:zh-hsk1-13-c-u-h-i-ch-nh-ph-n, chinese:zh-hsk1-14-v-c-u-t-nh-t, chinese:zh-hsk1-15-topic, chinese:zh-hsk1-16-ho-n-th-nh-c-b-n, chinese:zh-hsk1-17-th-i-gian-v-ng-y-gi, chinese:zh-hsk1-18-c-b-n, chinese:zh-hsk1-19-v-tr-c-b-n, chinese:zh-hsk1-2-c-u-nh-danh, chinese:zh-hsk1-20-n-i-danh-t, chinese:zh-hsk1-3-s-h-u-v-t-n-t-i, chinese:zh-hsk1-4-v-tr, chinese:zh-hsk1-5-s-h-u-v-b-ngh-a ...`
- `51a85a6c3274e6f4` — **505 lessons**
  - Text: `register discourse focus time viewpoint word order or lexical choice can change which grammar form is natural.`
  - IDs: `chinese:zh-hsk1-1-svo-c-b-n, chinese:zh-hsk1-10-v, chinese:zh-hsk1-11-v, chinese:zh-hsk1-12-t-h-i-gi-nguy-n-v-tr, chinese:zh-hsk1-13-c-u-h-i-ch-nh-ph-n, chinese:zh-hsk1-14-v-c-u-t-nh-t, chinese:zh-hsk1-15-topic, chinese:zh-hsk1-16-ho-n-th-nh-c-b-n, chinese:zh-hsk1-17-th-i-gian-v-ng-y-gi, chinese:zh-hsk1-18-c-b-n, chinese:zh-hsk1-19-v-tr-c-b-n, chinese:zh-hsk1-2-c-u-nh-danh, chinese:zh-hsk1-20-n-i-danh-t, chinese:zh-hsk1-3-s-h-u-v-t-n-t-i, chinese:zh-hsk1-4-v-tr, chinese:zh-hsk1-5-s-h-u-v-b-ngh-a ...`
- `1e2308c5ff934de7` — **505 lessons**
  - Text: `without looking back explain the meaning cue that tells you to use this grammar concept and give one example.`
  - IDs: `chinese:zh-hsk1-1-svo-c-b-n, chinese:zh-hsk1-10-v, chinese:zh-hsk1-11-v, chinese:zh-hsk1-12-t-h-i-gi-nguy-n-v-tr, chinese:zh-hsk1-13-c-u-h-i-ch-nh-ph-n, chinese:zh-hsk1-14-v-c-u-t-nh-t, chinese:zh-hsk1-15-topic, chinese:zh-hsk1-16-ho-n-th-nh-c-b-n, chinese:zh-hsk1-17-th-i-gian-v-ng-y-gi, chinese:zh-hsk1-18-c-b-n, chinese:zh-hsk1-19-v-tr-c-b-n, chinese:zh-hsk1-2-c-u-nh-danh, chinese:zh-hsk1-20-n-i-danh-t, chinese:zh-hsk1-3-s-h-u-v-t-n-t-i, chinese:zh-hsk1-4-v-tr, chinese:zh-hsk1-5-s-h-u-v-b-ngh-a ...`
- `12f409ad46614925` — **505 lessons**
  - Text: `say one personal sentence aloud with the concept then say a nearby alternative and notice the meaning change.`
  - IDs: `chinese:zh-hsk1-1-svo-c-b-n, chinese:zh-hsk1-10-v, chinese:zh-hsk1-11-v, chinese:zh-hsk1-12-t-h-i-gi-nguy-n-v-tr, chinese:zh-hsk1-13-c-u-h-i-ch-nh-ph-n, chinese:zh-hsk1-14-v-c-u-t-nh-t, chinese:zh-hsk1-15-topic, chinese:zh-hsk1-16-ho-n-th-nh-c-b-n, chinese:zh-hsk1-17-th-i-gian-v-ng-y-gi, chinese:zh-hsk1-18-c-b-n, chinese:zh-hsk1-19-v-tr-c-b-n, chinese:zh-hsk1-2-c-u-nh-danh, chinese:zh-hsk1-20-n-i-danh-t, chinese:zh-hsk1-3-s-h-u-v-t-n-t-i, chinese:zh-hsk1-4-v-tr, chinese:zh-hsk1-5-s-h-u-v-b-ngh-a ...`
- `7bf0bfa9a0f30891` — **505 lessons**
  - Text: `use the concept once in a short message or paragraph then check whether it expresses the intended meaning.`
  - IDs: `chinese:zh-hsk1-1-svo-c-b-n, chinese:zh-hsk1-10-v, chinese:zh-hsk1-11-v, chinese:zh-hsk1-12-t-h-i-gi-nguy-n-v-tr, chinese:zh-hsk1-13-c-u-h-i-ch-nh-ph-n, chinese:zh-hsk1-14-v-c-u-t-nh-t, chinese:zh-hsk1-15-topic, chinese:zh-hsk1-16-ho-n-th-nh-c-b-n, chinese:zh-hsk1-17-th-i-gian-v-ng-y-gi, chinese:zh-hsk1-18-c-b-n, chinese:zh-hsk1-19-v-tr-c-b-n, chinese:zh-hsk1-2-c-u-nh-danh, chinese:zh-hsk1-20-n-i-danh-t, chinese:zh-hsk1-3-s-h-u-v-t-n-t-i, chinese:zh-hsk1-4-v-tr, chinese:zh-hsk1-5-s-h-u-v-b-ngh-a ...`
- `fbef77803d599a56` — **505 lessons**
  - Text: `do not memorize grammar as a disconnected formula. remember what meaning the pattern creates in context.`
  - IDs: `chinese:zh-hsk1-1-svo-c-b-n, chinese:zh-hsk1-10-v, chinese:zh-hsk1-11-v, chinese:zh-hsk1-12-t-h-i-gi-nguy-n-v-tr, chinese:zh-hsk1-13-c-u-h-i-ch-nh-ph-n, chinese:zh-hsk1-14-v-c-u-t-nh-t, chinese:zh-hsk1-15-topic, chinese:zh-hsk1-16-ho-n-th-nh-c-b-n, chinese:zh-hsk1-17-th-i-gian-v-ng-y-gi, chinese:zh-hsk1-18-c-b-n, chinese:zh-hsk1-19-v-tr-c-b-n, chinese:zh-hsk1-2-c-u-nh-danh, chinese:zh-hsk1-20-n-i-danh-t, chinese:zh-hsk1-3-s-h-u-v-t-n-t-i, chinese:zh-hsk1-4-v-tr, chinese:zh-hsk1-5-s-h-u-v-b-ngh-a ...`
- `d2236271d29b8ab9` — **505 lessons**
  - Text: `start with the meaning you want to express. then notice how this grammar concept shapes the sentence.`
  - IDs: `chinese:zh-hsk1-1-svo-c-b-n, chinese:zh-hsk1-10-v, chinese:zh-hsk1-11-v, chinese:zh-hsk1-12-t-h-i-gi-nguy-n-v-tr, chinese:zh-hsk1-13-c-u-h-i-ch-nh-ph-n, chinese:zh-hsk1-14-v-c-u-t-nh-t, chinese:zh-hsk1-15-topic, chinese:zh-hsk1-16-ho-n-th-nh-c-b-n, chinese:zh-hsk1-17-th-i-gian-v-ng-y-gi, chinese:zh-hsk1-18-c-b-n, chinese:zh-hsk1-19-v-tr-c-b-n, chinese:zh-hsk1-2-c-u-nh-danh, chinese:zh-hsk1-20-n-i-danh-t, chinese:zh-hsk1-3-s-h-u-v-t-n-t-i, chinese:zh-hsk1-4-v-tr, chinese:zh-hsk1-5-s-h-u-v-b-ngh-a ...`
- `46a0a771860b5c16` — **505 lessons**
  - Text: `dùng cấu trúc một lần trong tin nhắn hoặc đoạn ngắn rồi kiểm tra xem nó có đúng ý bạn muốn nói không.`
  - IDs: `chinese:zh-hsk1-1-svo-c-b-n, chinese:zh-hsk1-10-v, chinese:zh-hsk1-11-v, chinese:zh-hsk1-12-t-h-i-gi-nguy-n-v-tr, chinese:zh-hsk1-13-c-u-h-i-ch-nh-ph-n, chinese:zh-hsk1-14-v-c-u-t-nh-t, chinese:zh-hsk1-15-topic, chinese:zh-hsk1-16-ho-n-th-nh-c-b-n, chinese:zh-hsk1-17-th-i-gian-v-ng-y-gi, chinese:zh-hsk1-18-c-b-n, chinese:zh-hsk1-19-v-tr-c-b-n, chinese:zh-hsk1-2-c-u-nh-danh, chinese:zh-hsk1-20-n-i-danh-t, chinese:zh-hsk1-3-s-h-u-v-t-n-t-i, chinese:zh-hsk1-4-v-tr, chinese:zh-hsk1-5-s-h-u-v-b-ngh-a ...`
- `972bfc82a7777f21` — **505 lessons**
  - Text: `không nhìn lại bài hãy nói dấu hiệu về ý nghĩa khiến bạn chọn điểm ngữ pháp này và tự cho một ví dụ.`
  - IDs: `chinese:zh-hsk1-1-svo-c-b-n, chinese:zh-hsk1-10-v, chinese:zh-hsk1-11-v, chinese:zh-hsk1-12-t-h-i-gi-nguy-n-v-tr, chinese:zh-hsk1-13-c-u-h-i-ch-nh-ph-n, chinese:zh-hsk1-14-v-c-u-t-nh-t, chinese:zh-hsk1-15-topic, chinese:zh-hsk1-16-ho-n-th-nh-c-b-n, chinese:zh-hsk1-17-th-i-gian-v-ng-y-gi, chinese:zh-hsk1-18-c-b-n, chinese:zh-hsk1-19-v-tr-c-b-n, chinese:zh-hsk1-2-c-u-nh-danh, chinese:zh-hsk1-20-n-i-danh-t, chinese:zh-hsk1-3-s-h-u-v-t-n-t-i, chinese:zh-hsk1-4-v-tr, chinese:zh-hsk1-5-s-h-u-v-b-ngh-a ...`
- `3521ebf588b847dc` — **505 lessons**
  - Text: `when you see the concept in a text identify the meaning relationship and context that motivated it.`
  - IDs: `chinese:zh-hsk1-1-svo-c-b-n, chinese:zh-hsk1-10-v, chinese:zh-hsk1-11-v, chinese:zh-hsk1-12-t-h-i-gi-nguy-n-v-tr, chinese:zh-hsk1-13-c-u-h-i-ch-nh-ph-n, chinese:zh-hsk1-14-v-c-u-t-nh-t, chinese:zh-hsk1-15-topic, chinese:zh-hsk1-16-ho-n-th-nh-c-b-n, chinese:zh-hsk1-17-th-i-gian-v-ng-y-gi, chinese:zh-hsk1-18-c-b-n, chinese:zh-hsk1-19-v-tr-c-b-n, chinese:zh-hsk1-2-c-u-nh-danh, chinese:zh-hsk1-20-n-i-danh-t, chinese:zh-hsk1-3-s-h-u-v-t-n-t-i, chinese:zh-hsk1-4-v-tr, chinese:zh-hsk1-5-s-h-u-v-b-ngh-a ...`
- `876f54ed7145e764` — **505 lessons**
  - Text: `nói thành tiếng một câu thật của bạn rồi thử một lựa chọn gần và nhận ra ý nghĩa thay đổi thế nào.`
  - IDs: `chinese:zh-hsk1-1-svo-c-b-n, chinese:zh-hsk1-10-v, chinese:zh-hsk1-11-v, chinese:zh-hsk1-12-t-h-i-gi-nguy-n-v-tr, chinese:zh-hsk1-13-c-u-h-i-ch-nh-ph-n, chinese:zh-hsk1-14-v-c-u-t-nh-t, chinese:zh-hsk1-15-topic, chinese:zh-hsk1-16-ho-n-th-nh-c-b-n, chinese:zh-hsk1-17-th-i-gian-v-ng-y-gi, chinese:zh-hsk1-18-c-b-n, chinese:zh-hsk1-19-v-tr-c-b-n, chinese:zh-hsk1-2-c-u-nh-danh, chinese:zh-hsk1-20-n-i-danh-t, chinese:zh-hsk1-3-s-h-u-v-t-n-t-i, chinese:zh-hsk1-4-v-tr, chinese:zh-hsk1-5-s-h-u-v-b-ngh-a ...`
- `4076fb20d121a845` — **505 lessons**
  - Text: `meaning  pattern  context. the form is useful only when it matches the speakers intended meaning.`
  - IDs: `chinese:zh-hsk1-1-svo-c-b-n, chinese:zh-hsk1-10-v, chinese:zh-hsk1-11-v, chinese:zh-hsk1-12-t-h-i-gi-nguy-n-v-tr, chinese:zh-hsk1-13-c-u-h-i-ch-nh-ph-n, chinese:zh-hsk1-14-v-c-u-t-nh-t, chinese:zh-hsk1-15-topic, chinese:zh-hsk1-16-ho-n-th-nh-c-b-n, chinese:zh-hsk1-17-th-i-gian-v-ng-y-gi, chinese:zh-hsk1-18-c-b-n, chinese:zh-hsk1-19-v-tr-c-b-n, chinese:zh-hsk1-2-c-u-nh-danh, chinese:zh-hsk1-20-n-i-danh-t, chinese:zh-hsk1-3-s-h-u-v-t-n-t-i, chinese:zh-hsk1-4-v-tr, chinese:zh-hsk1-5-s-h-u-v-b-ngh-a ...`
- `4378f255ff46533c` — **505 lessons**
  - Text: `khi nghe thấy cấu trúc chú ý từ xung quanh và tình huống khiến lựa chọn ngữ pháp đó có ý nghĩa.`
  - IDs: `chinese:zh-hsk1-1-svo-c-b-n, chinese:zh-hsk1-10-v, chinese:zh-hsk1-11-v, chinese:zh-hsk1-12-t-h-i-gi-nguy-n-v-tr, chinese:zh-hsk1-13-c-u-h-i-ch-nh-ph-n, chinese:zh-hsk1-14-v-c-u-t-nh-t, chinese:zh-hsk1-15-topic, chinese:zh-hsk1-16-ho-n-th-nh-c-b-n, chinese:zh-hsk1-17-th-i-gian-v-ng-y-gi, chinese:zh-hsk1-18-c-b-n, chinese:zh-hsk1-19-v-tr-c-b-n, chinese:zh-hsk1-2-c-u-nh-danh, chinese:zh-hsk1-20-n-i-danh-t, chinese:zh-hsk1-3-s-h-u-v-t-n-t-i, chinese:zh-hsk1-4-v-tr, chinese:zh-hsk1-5-s-h-u-v-b-ngh-a ...`

## Architecture inventory

### database_or_seed

- `.upgrade_backups/becoming-asset-route-20260809-222651/app.py`
- `.upgrade_backups/becoming-phase4-20260809-225011/app.py`
- `.upgrade_backups/becoming-phase4-router-r1-20260809-225726/app.py`
- `.upgrade_backups/becoming-phase4-stabilize-20260809-230905/app.py`
- `.upgrade_backups/becoming-phase5-20260810-060142/app.py`
- `.upgrade_backups/becoming-phase6-20260810-062734/app.py`
- `.upgrade_backups/becoming-phase7-20260810-070014/app.py`
- `.upgrade_backups/becoming-phase8-20260810-071827/app.py`
- `.upgrade_backups/becoming-uiux-polish-20260810-090140/app.py`
- `.upgrade_backups/becoming-uiux-polish-r2-20260810-102546/app.py`
- `.upgrade_backups/becoming-v2-preview-20260809-212442/app.py`
- `.upgrade_backups/becoming-v210-combined-20260810-141955/app.py`
- `.upgrade_backups/becoming-v210-combined-20260810-141955/scripts/becoming_release_gate.py`
- `.upgrade_backups/becoming-v211-high-fidelity-20260810-164345/scripts/becoming_release_gate.py`
- `.upgrade_backups/learning-repository-boundary-v132-20260811-103607/SAAS_ARCHITECTURE.md`
- `.upgrade_backups/learning-repository-boundary-v132-20260811-103607/app.py`
- `.upgrade_backups/learning-repository-boundary-v132-20260811-103607/scripts/becoming_release_gate.py`
- `.upgrade_backups/learning-repository-boundary-v132-20260811-103607/scripts/validate_postgres_foundation.py`
- `.upgrade_backups/learning-repository-boundary-v132-r1-20260811-104126/SAAS_ARCHITECTURE.md`
- `.upgrade_backups/learning-repository-boundary-v132-r1-20260811-104126/app.py`
- `.upgrade_backups/learning-repository-boundary-v132-r1-20260811-104126/scripts/becoming_release_gate.py`
- `.upgrade_backups/learning-repository-boundary-v132-r1-20260811-104126/scripts/validate_postgres_foundation.py`
- `.upgrade_backups/persistence-readiness-v131-20260811-095521/SAAS_ARCHITECTURE.md`
- `.upgrade_backups/persistence-readiness-v131-20260811-095521/scripts/becoming_release_gate.py`
- `.upgrade_backups/persistence-readiness-v131-20260811-095521/scripts/validate_postgres_foundation.py`
- `.upgrade_backups/persistence-readiness-v131-r1-20260811-102041/SAAS_ARCHITECTURE.md`
- `.upgrade_backups/persistence-readiness-v131-r1-20260811-102041/scripts/becoming_release_gate.py`
- `.upgrade_backups/persistence-readiness-v131-r1-20260811-102041/scripts/validate_postgres_foundation.py`
- `.upgrade_backups/postgres-foundation-v130-20260811-081612/README.md`
- `.upgrade_backups/postgres-foundation-v130-20260811-081612/SAAS_ARCHITECTURE.md`
- `.upgrade_backups/postgres-foundation-v130-20260811-081612/compose.yaml`
- `.upgrade_backups/postgres-foundation-v130-20260811-081612/scripts/becoming_release_gate.py`
- `.upgrade_backups/postgres-foundation-v130-20260811-082612/README.md`
- `.upgrade_backups/postgres-foundation-v130-20260811-082612/SAAS_ARCHITECTURE.md`
- `.upgrade_backups/postgres-foundation-v130-20260811-082612/compose.yaml`
- `.upgrade_backups/postgres-foundation-v130-20260811-082612/scripts/becoming_release_gate.py`
- `.upgrade_backups/postgres-foundation-v130-20260811-083013/README.md`
- `.upgrade_backups/postgres-foundation-v130-20260811-083013/SAAS_ARCHITECTURE.md`
- `.upgrade_backups/postgres-foundation-v130-20260811-083013/compose.yaml`
- `.upgrade_backups/postgres-foundation-v130-20260811-083013/scripts/becoming_release_gate.py`
- `.upgrade_backups/postgres-foundation-v130-20260811-083442/README.md`
- `.upgrade_backups/postgres-foundation-v130-20260811-083442/SAAS_ARCHITECTURE.md`
- `.upgrade_backups/postgres-foundation-v130-20260811-083442/compose.yaml`
- `.upgrade_backups/postgres-foundation-v130-20260811-083442/scripts/becoming_release_gate.py`
- `.upgrade_backups/postgres-foundation-v130-20260811-084110/README.md`
- `.upgrade_backups/postgres-foundation-v130-20260811-084110/SAAS_ARCHITECTURE.md`
- `.upgrade_backups/postgres-foundation-v130-20260811-084110/compose.yaml`
- `.upgrade_backups/postgres-foundation-v130-20260811-084110/scripts/becoming_release_gate.py`
- `.upgrade_backups/specialized-persistence-v133-20260811-121622/SAAS_ARCHITECTURE.md`
- `.upgrade_backups/specialized-persistence-v133-20260811-121622/scripts/becoming_release_gate.py`
- `.upgrade_backups/specialized-persistence-v133-20260811-121622/writing_coach/becoming_outcomes_selftest.py`
- `.upgrade_backups/specialized-persistence-v133-20260811-121935/SAAS_ARCHITECTURE.md`
- `.upgrade_backups/specialized-persistence-v133-20260811-121935/scripts/becoming_release_gate.py`
- `.upgrade_backups/specialized-persistence-v133-20260811-121935/writing_coach/becoming_outcomes_selftest.py`
- `.upgrade_backups/specialized-persistence-v133-20260811-122835/SAAS_ARCHITECTURE.md`
- `.upgrade_backups/specialized-persistence-v133-20260811-122835/scripts/becoming_release_gate.py`
- `.upgrade_backups/specialized-persistence-v133-20260811-122835/writing_coach/becoming_outcomes_selftest.py`
- `.upgrade_backups/v090-20260809-162329/app.py`
- `.upgrade_backups/v091-20260809-175435/app.py`
- `.upgrade_backups/v100-20260809-183425/app.py`
- `.upgrade_backups/v110-20260809-184527/app.py`
- `.upgrade_backups/v110-20260809-185038/app.py`
- `.upgrade_backups/v120-20260809-193308/app.py`
- `SAAS_ARCHITECTURE.md`
- `docs/ORENA_GRAMMAR_MIGRATION_MAP.json`
- `migrations/versions/20260811_0001_postgres_foundation.py`
- `scripts/becoming_release_gate.py`
- `scripts/validate_learning_repository_boundary.py`
- `scripts/validate_postgres_foundation.py`
- `tests/test_ai_capability_migration.py`
- `tests/test_persistence_runtime_readiness.py`
- `tests/test_postgres_foundation.py`
- `writing_coach/becoming_outcomes_selftest.py`
- `writing_coach/persistence/importer.py`
- `writing_coach/persistence/learning_repository.py`
- `writing_coach/persistence/models.py`
- `writing_coach/persistence/read_compare.py`
- `writing_coach/persistence/readiness_selftest.py`
- `writing_coach/persistence/selftest.py`

### hardcoded_or_generated

- `.upgrade_backups/becoming-asset-route-20260809-222651/app.py`
- `.upgrade_backups/becoming-canonical-v290-20260810-131650/static/becoming/domain/i18n.js`
- `.upgrade_backups/becoming-journey-v2156-r4-20260811-062532/static/becoming/visual-alignment.css`
- `.upgrade_backups/becoming-journey-v2156-r4-20260811-063009/static/becoming/visual-alignment.css`
- `.upgrade_backups/becoming-journey-v2156-r4-20260811-063036/static/becoming/visual-alignment.css`
- `.upgrade_backups/becoming-phase4-20260809-225011/app.py`
- `.upgrade_backups/becoming-phase4-router-r1-20260809-225726/app.py`
- `.upgrade_backups/becoming-phase4-stabilize-20260809-230905/app.py`
- `.upgrade_backups/becoming-phase5-20260810-060142/app.py`
- `.upgrade_backups/becoming-phase6-20260810-062734/app.py`
- `.upgrade_backups/becoming-phase7-20260810-070014/app.py`
- `.upgrade_backups/becoming-phase8-20260810-071827/app.py`
- `.upgrade_backups/becoming-uiux-polish-20260810-090140/app.py`
- `.upgrade_backups/becoming-uiux-polish-r2-20260810-102546/app.py`
- `.upgrade_backups/becoming-v2-preview-20260809-212442/app.py`
- `.upgrade_backups/becoming-v210-combined-20260810-141955/UPGRADE_INCIDENTS.md`
- `.upgrade_backups/becoming-v210-combined-20260810-141955/app.py`
- `.upgrade_backups/becoming-v210-combined-20260810-141955/static/becoming/domain/i18n.js`
- `.upgrade_backups/becoming-v213-trusted-ui-20260810-202200/UPGRADE_INCIDENTS.md`
- `.upgrade_backups/becoming-v215-layout-system-20260810-204314/UPGRADE_INCIDENTS.md`
- `.upgrade_backups/becoming-v2151-live-layout-20260810-211917/UPGRADE_INCIDENTS.md`
- `.upgrade_backups/learning-repository-boundary-v132-20260811-103607/README.md`
- `.upgrade_backups/learning-repository-boundary-v132-20260811-103607/SAAS_ARCHITECTURE.md`
- `.upgrade_backups/learning-repository-boundary-v132-20260811-103607/app.py`
- `.upgrade_backups/learning-repository-boundary-v132-r1-20260811-104126/README.md`
- `.upgrade_backups/learning-repository-boundary-v132-r1-20260811-104126/SAAS_ARCHITECTURE.md`
- `.upgrade_backups/learning-repository-boundary-v132-r1-20260811-104126/app.py`
- `.upgrade_backups/persistence-readiness-v131-20260811-095521/README.md`
- `.upgrade_backups/persistence-readiness-v131-r1-20260811-102041/README.md`
- `.upgrade_backups/postgres-foundation-v130-20260811-081612/README.md`
- `.upgrade_backups/postgres-foundation-v130-20260811-081612/compose.yaml`
- `.upgrade_backups/postgres-foundation-v130-20260811-082612/README.md`
- `.upgrade_backups/postgres-foundation-v130-20260811-082612/compose.yaml`
- `.upgrade_backups/postgres-foundation-v130-20260811-083013/README.md`
- `.upgrade_backups/postgres-foundation-v130-20260811-083013/compose.yaml`
- `.upgrade_backups/postgres-foundation-v130-20260811-083442/README.md`
- `.upgrade_backups/postgres-foundation-v130-20260811-083442/compose.yaml`
- `.upgrade_backups/postgres-foundation-v130-20260811-084110/README.md`
- `.upgrade_backups/postgres-foundation-v130-20260811-084110/compose.yaml`
- `.upgrade_backups/specialized-persistence-v133-20260811-121622/README.md`
- `.upgrade_backups/specialized-persistence-v133-20260811-121622/SAAS_ARCHITECTURE.md`
- `.upgrade_backups/specialized-persistence-v133-20260811-121622/app.py`
- `.upgrade_backups/specialized-persistence-v133-20260811-121622/docs/LEARNING_REPOSITORY_BOUNDARY.md`
- `.upgrade_backups/specialized-persistence-v133-20260811-121622/writing_coach/becoming_outcomes.py`
- `.upgrade_backups/specialized-persistence-v133-20260811-121935/README.md`
- `.upgrade_backups/specialized-persistence-v133-20260811-121935/SAAS_ARCHITECTURE.md`
- `.upgrade_backups/specialized-persistence-v133-20260811-121935/app.py`
- `.upgrade_backups/specialized-persistence-v133-20260811-121935/docs/LEARNING_REPOSITORY_BOUNDARY.md`
- `.upgrade_backups/specialized-persistence-v133-20260811-121935/writing_coach/becoming_outcomes.py`
- `.upgrade_backups/specialized-persistence-v133-20260811-122835/README.md`
- `.upgrade_backups/specialized-persistence-v133-20260811-122835/SAAS_ARCHITECTURE.md`
- `.upgrade_backups/specialized-persistence-v133-20260811-122835/app.py`
- `.upgrade_backups/specialized-persistence-v133-20260811-122835/docs/LEARNING_REPOSITORY_BOUNDARY.md`
- `.upgrade_backups/specialized-persistence-v133-20260811-122835/writing_coach/becoming_outcomes.py`
- `.upgrade_backups/v090-20260809-162329/app.py`
- `.upgrade_backups/v090-20260809-162329/static/style.css`
- `.upgrade_backups/v090-20260809-162329/templates/index.html`
- `.upgrade_backups/v091-20260809-175435/app.py`
- `.upgrade_backups/v091-20260809-175435/static/app.js`
- `.upgrade_backups/v091-20260809-175435/static/style.css`
- `.upgrade_backups/v091-20260809-175435/templates/index.html`
- `.upgrade_backups/v092-20260809-181757/static/style.css`
- `.upgrade_backups/v092-20260809-181757/templates/index.html`
- `.upgrade_backups/v100-20260809-183425/app.py`
- `.upgrade_backups/v100-20260809-183425/static/app.js`
- `.upgrade_backups/v100-20260809-183425/templates/index.html`
- `.upgrade_backups/v110-20260809-184527/app.py`
- `.upgrade_backups/v110-20260809-184527/static/app.js`
- `.upgrade_backups/v110-20260809-184527/static/chinese.js`
- `.upgrade_backups/v110-20260809-184527/static/style.css`
- `.upgrade_backups/v110-20260809-184527/templates/index.html`
- `.upgrade_backups/v110-20260809-185038/app.py`
- `.upgrade_backups/v110-20260809-185038/static/app.js`
- `.upgrade_backups/v110-20260809-185038/static/chinese.js`
- `.upgrade_backups/v110-20260809-185038/static/style.css`
- `.upgrade_backups/v110-20260809-185038/templates/index.html`
- `.upgrade_backups/v120-20260809-193308/ARCHITECTURE.md`
- `.upgrade_backups/v120-20260809-193308/app.py`
- `.upgrade_backups/v120-20260809-193308/templates/index.html`
- `.upgrade_backups/v122-20260809-194848/templates/index.html`

### ui_components

- `.upgrade_backups/becoming-canonical-v290-20260810-131650/static/becoming/domain/feedback.js`
- `.upgrade_backups/becoming-canonical-v290-20260810-131650/static/becoming/domain/i18n.js`
- `.upgrade_backups/becoming-canonical-v290-20260810-131650/static/becoming/domain/support.js`
- `.upgrade_backups/becoming-journey-v2156-r4-20260811-062532/static/becoming/visual-alignment.css`
- `.upgrade_backups/becoming-journey-v2156-r4-20260811-063009/static/becoming/visual-alignment.css`
- `.upgrade_backups/becoming-journey-v2156-r4-20260811-063036/static/becoming/visual-alignment.css`
- `.upgrade_backups/becoming-phase2-20260809-215216/static/becoming/domain/feedback.js`
- `.upgrade_backups/becoming-phase2-20260809-215216/static/becoming/screens/onboarding.js`
- `.upgrade_backups/becoming-phase3-20260809-221348/static/becoming/domain/feedback.js`
- `.upgrade_backups/becoming-phase3-20260809-221348/static/becoming/screens/onboarding.js`
- `.upgrade_backups/becoming-phase4-20260809-225011/static/becoming/domain/feedback.js`
- `.upgrade_backups/becoming-phase4-20260809-225011/static/becoming/screens/onboarding.js`
- `.upgrade_backups/becoming-uiux-polish-20260810-090140/static/becoming/domain/feedback.js`
- `.upgrade_backups/becoming-uiux-polish-20260810-090140/static/becoming/screens/onboarding.js`
- `.upgrade_backups/becoming-uiux-polish-r2-20260810-102546/static/becoming/domain/feedback.js`
- `.upgrade_backups/becoming-uiux-polish-r2-20260810-102546/static/becoming/domain/support.js`
- `.upgrade_backups/becoming-uiux-polish-r2-20260810-102546/static/becoming/screens/onboarding.js`
- `.upgrade_backups/becoming-v210-combined-20260810-141955/static/becoming/domain/i18n.js`
- `static/becoming/api.js`
- `static/becoming/app.css`
- `static/becoming/app.js`
- `static/becoming/components/grammar-learning.js`
- `static/becoming/domain/feedback-map.js`
- `static/becoming/domain/feedback.js`
- `static/becoming/domain/i18n.js`
- `static/becoming/domain/screen-contract.js`
- `static/becoming/domain/support.js`
- `static/becoming/grammar.css`
- `static/becoming/router.js`
- `static/becoming/screens/grammar.js`
- `static/becoming/visual-alignment.css`

### localization

- `.upgrade_backups/becoming-canonical-v290-20260810-131650/static/becoming/domain/i18n.js`
- `.upgrade_backups/becoming-v210-combined-20260810-141955/static/becoming/domain/i18n.js`
- `.upgrade_backups/v110-20260809-184527/writing_coach/languages/chinese/profile.py`
- `.upgrade_backups/v110-20260809-185038/writing_coach/languages/chinese/profile.py`
- `.upgrade_backups/v110-20260809-185038/writing_coach/languages/runtime.py`
- `static/becoming/domain/i18n.js`
- `writing_coach/languages/chinese/grammar_course.py`
- `writing_coach/languages/chinese/grammar_curriculum.json`
- `writing_coach/languages/chinese/grammar_curriculum.py`
- `writing_coach/languages/chinese/grammar_knowledge.json`
- `writing_coach/languages/chinese/grammar_knowledge_base.py`
- `writing_coach/languages/chinese/profile.py`
- `writing_coach/languages/english/grammar_course.py`
- `writing_coach/languages/english/grammar_curriculum.json`
- `writing_coach/languages/english/grammar_curriculum.py`
- `writing_coach/languages/english/grammar_knowledge.json`
- `writing_coach/languages/english/grammar_knowledge_base.py`
- `writing_coach/languages/english/profile.py`
- `writing_coach/languages/grammar_registry.py`
- `writing_coach/languages/runtime.py`

### completion_progress

- `.upgrade_backups/becoming-asset-route-20260809-222651/app.py`
- `.upgrade_backups/becoming-canonical-v290-20260810-131650/static/becoming/domain/feedback.js`
- `.upgrade_backups/becoming-canonical-v290-20260810-131650/static/becoming/domain/i18n.js`
- `.upgrade_backups/becoming-canonical-v290-20260810-131650/static/becoming/domain/support.js`
- `.upgrade_backups/becoming-journey-v2156-r4-20260811-062532/static/becoming/visual-alignment.css`
- `.upgrade_backups/becoming-journey-v2156-r4-20260811-063009/static/becoming/visual-alignment.css`
- `.upgrade_backups/becoming-journey-v2156-r4-20260811-063036/static/becoming/visual-alignment.css`
- `.upgrade_backups/becoming-phase2-20260809-215216/static/becoming/domain/feedback.js`
- `.upgrade_backups/becoming-phase2-20260809-215216/static/becoming/screens/onboarding.js`
- `.upgrade_backups/becoming-phase3-20260809-221348/static/becoming/domain/feedback.js`
- `.upgrade_backups/becoming-phase3-20260809-221348/static/becoming/screens/onboarding.js`
- `.upgrade_backups/becoming-phase4-20260809-225011/app.py`
- `.upgrade_backups/becoming-phase4-20260809-225011/static/becoming/domain/feedback.js`
- `.upgrade_backups/becoming-phase4-20260809-225011/static/becoming/screens/onboarding.js`
- `.upgrade_backups/becoming-phase4-router-r1-20260809-225726/app.py`
- `.upgrade_backups/becoming-phase4-stabilize-20260809-230905/app.py`
- `.upgrade_backups/becoming-phase5-20260810-060142/app.py`
- `.upgrade_backups/becoming-phase6-20260810-062734/app.py`
- `.upgrade_backups/becoming-phase7-20260810-070014/app.py`
- `.upgrade_backups/becoming-phase8-20260810-071827/app.py`
- `.upgrade_backups/becoming-uiux-polish-20260810-090140/app.py`
- `.upgrade_backups/becoming-uiux-polish-20260810-090140/static/becoming/screens/onboarding.js`
- `.upgrade_backups/becoming-uiux-polish-r2-20260810-102546/app.py`
- `.upgrade_backups/becoming-uiux-polish-r2-20260810-102546/static/becoming/domain/support.js`
- `.upgrade_backups/becoming-uiux-polish-r2-20260810-102546/static/becoming/screens/onboarding.js`
- `.upgrade_backups/becoming-v2-preview-20260809-212442/app.py`
- `.upgrade_backups/becoming-v210-combined-20260810-141955/UPGRADE_INCIDENTS.md`
- `.upgrade_backups/becoming-v210-combined-20260810-141955/app.py`
- `.upgrade_backups/becoming-v210-combined-20260810-141955/scripts/becoming_release_gate.py`
- `.upgrade_backups/becoming-v210-combined-20260810-141955/static/becoming/domain/i18n.js`
- `.upgrade_backups/becoming-v211-high-fidelity-20260810-164345/docs/BECOMING_UIUX_IMPLEMENTATION_CONTRACT.md`
- `.upgrade_backups/becoming-v211-high-fidelity-20260810-164345/scripts/becoming_release_gate.py`
- `.upgrade_backups/becoming-v213-trusted-ui-20260810-202200/UPGRADE_INCIDENTS.md`
- `.upgrade_backups/becoming-v215-layout-system-20260810-204314/UPGRADE_INCIDENTS.md`
- `.upgrade_backups/becoming-v2151-live-layout-20260810-211917/UPGRADE_INCIDENTS.md`
- `.upgrade_backups/learning-repository-boundary-v132-20260811-103607/README.md`
- `.upgrade_backups/learning-repository-boundary-v132-20260811-103607/SAAS_ARCHITECTURE.md`
- `.upgrade_backups/learning-repository-boundary-v132-20260811-103607/app.py`
- `.upgrade_backups/learning-repository-boundary-v132-20260811-103607/docs/PERSISTENCE_RUNTIME_READINESS.md`
- `.upgrade_backups/learning-repository-boundary-v132-20260811-103607/scripts/becoming_release_gate.py`
- `.upgrade_backups/learning-repository-boundary-v132-20260811-103607/scripts/validate_postgres_foundation.py`
- `.upgrade_backups/learning-repository-boundary-v132-r1-20260811-104126/README.md`
- `.upgrade_backups/learning-repository-boundary-v132-r1-20260811-104126/SAAS_ARCHITECTURE.md`
- `.upgrade_backups/learning-repository-boundary-v132-r1-20260811-104126/app.py`
- `.upgrade_backups/learning-repository-boundary-v132-r1-20260811-104126/docs/PERSISTENCE_RUNTIME_READINESS.md`
- `.upgrade_backups/learning-repository-boundary-v132-r1-20260811-104126/scripts/becoming_release_gate.py`
- `.upgrade_backups/learning-repository-boundary-v132-r1-20260811-104126/scripts/validate_postgres_foundation.py`
- `.upgrade_backups/persistence-readiness-v131-20260811-095521/README.md`
- `.upgrade_backups/persistence-readiness-v131-20260811-095521/SAAS_ARCHITECTURE.md`
- `.upgrade_backups/persistence-readiness-v131-20260811-095521/scripts/becoming_release_gate.py`
- `.upgrade_backups/persistence-readiness-v131-20260811-095521/scripts/validate_postgres_foundation.py`
- `.upgrade_backups/persistence-readiness-v131-r1-20260811-102041/README.md`
- `.upgrade_backups/persistence-readiness-v131-r1-20260811-102041/SAAS_ARCHITECTURE.md`
- `.upgrade_backups/persistence-readiness-v131-r1-20260811-102041/scripts/becoming_release_gate.py`
- `.upgrade_backups/persistence-readiness-v131-r1-20260811-102041/scripts/validate_postgres_foundation.py`
- `.upgrade_backups/postgres-foundation-v130-20260811-081612/README.md`
- `.upgrade_backups/postgres-foundation-v130-20260811-081612/SAAS_ARCHITECTURE.md`
- `.upgrade_backups/postgres-foundation-v130-20260811-081612/scripts/becoming_release_gate.py`
- `.upgrade_backups/postgres-foundation-v130-20260811-082612/README.md`
- `.upgrade_backups/postgres-foundation-v130-20260811-082612/SAAS_ARCHITECTURE.md`
- `.upgrade_backups/postgres-foundation-v130-20260811-082612/scripts/becoming_release_gate.py`
- `.upgrade_backups/postgres-foundation-v130-20260811-083013/README.md`
- `.upgrade_backups/postgres-foundation-v130-20260811-083013/SAAS_ARCHITECTURE.md`
- `.upgrade_backups/postgres-foundation-v130-20260811-083013/scripts/becoming_release_gate.py`
- `.upgrade_backups/postgres-foundation-v130-20260811-083442/README.md`
- `.upgrade_backups/postgres-foundation-v130-20260811-083442/SAAS_ARCHITECTURE.md`
- `.upgrade_backups/postgres-foundation-v130-20260811-083442/scripts/becoming_release_gate.py`
- `.upgrade_backups/postgres-foundation-v130-20260811-084110/README.md`
- `.upgrade_backups/postgres-foundation-v130-20260811-084110/SAAS_ARCHITECTURE.md`
- `.upgrade_backups/postgres-foundation-v130-20260811-084110/scripts/becoming_release_gate.py`
- `.upgrade_backups/specialized-persistence-v133-20260811-121622/README.md`
- `.upgrade_backups/specialized-persistence-v133-20260811-121622/SAAS_ARCHITECTURE.md`
- `.upgrade_backups/specialized-persistence-v133-20260811-121622/app.py`
- `.upgrade_backups/specialized-persistence-v133-20260811-121622/docs/LEARNING_REPOSITORY_BOUNDARY.md`
- `.upgrade_backups/specialized-persistence-v133-20260811-121622/docs/PERSISTENCE_RUNTIME_READINESS.md`
- `.upgrade_backups/specialized-persistence-v133-20260811-121622/scripts/becoming_release_gate.py`
- `.upgrade_backups/specialized-persistence-v133-20260811-121622/scripts/validate_learning_repository_boundary.py`
- `.upgrade_backups/specialized-persistence-v133-20260811-121935/README.md`
- `.upgrade_backups/specialized-persistence-v133-20260811-121935/SAAS_ARCHITECTURE.md`
- `.upgrade_backups/specialized-persistence-v133-20260811-121935/app.py`

### cross_skill

- `.upgrade_backups/becoming-asset-route-20260809-222651/app.py`
- `.upgrade_backups/becoming-canonical-v290-20260810-131650/static/becoming/domain/i18n.js`
- `.upgrade_backups/becoming-canonical-v290-20260810-131650/static/becoming/domain/support.js`
- `.upgrade_backups/becoming-journey-v2156-r4-20260811-062532/static/becoming/visual-alignment.css`
- `.upgrade_backups/becoming-journey-v2156-r4-20260811-063009/static/becoming/visual-alignment.css`
- `.upgrade_backups/becoming-journey-v2156-r4-20260811-063036/static/becoming/visual-alignment.css`
- `.upgrade_backups/becoming-phase2-20260809-215216/static/becoming/domain/feedback.js`
- `.upgrade_backups/becoming-phase2-20260809-215216/static/becoming/screens/onboarding.js`
- `.upgrade_backups/becoming-phase3-20260809-221348/static/becoming/domain/feedback.js`
- `.upgrade_backups/becoming-phase3-20260809-221348/static/becoming/screens/onboarding.js`
- `.upgrade_backups/becoming-phase4-20260809-225011/app.py`
- `.upgrade_backups/becoming-phase4-20260809-225011/static/becoming/domain/feedback.js`
- `.upgrade_backups/becoming-phase4-20260809-225011/static/becoming/screens/onboarding.js`
- `.upgrade_backups/becoming-phase4-router-r1-20260809-225726/app.py`
- `.upgrade_backups/becoming-phase4-stabilize-20260809-230905/app.py`
- `.upgrade_backups/becoming-phase5-20260810-060142/app.py`
- `.upgrade_backups/becoming-phase6-20260810-062734/app.py`
- `.upgrade_backups/becoming-phase7-20260810-070014/app.py`
- `.upgrade_backups/becoming-phase8-20260810-071827/app.py`
- `.upgrade_backups/becoming-uiux-polish-20260810-090140/app.py`
- `.upgrade_backups/becoming-uiux-polish-20260810-090140/static/becoming/domain/feedback.js`
- `.upgrade_backups/becoming-uiux-polish-20260810-090140/static/becoming/screens/onboarding.js`
- `.upgrade_backups/becoming-uiux-polish-r2-20260810-102546/app.py`
- `.upgrade_backups/becoming-uiux-polish-r2-20260810-102546/static/becoming/domain/feedback.js`
- `.upgrade_backups/becoming-uiux-polish-r2-20260810-102546/static/becoming/domain/support.js`
- `.upgrade_backups/becoming-uiux-polish-r2-20260810-102546/static/becoming/screens/onboarding.js`
- `.upgrade_backups/becoming-v2-preview-20260809-212442/app.py`
- `.upgrade_backups/becoming-v210-combined-20260810-141955/UPGRADE_INCIDENTS.md`
- `.upgrade_backups/becoming-v210-combined-20260810-141955/app.py`
- `.upgrade_backups/becoming-v210-combined-20260810-141955/scripts/becoming_release_gate.py`
- `.upgrade_backups/becoming-v210-combined-20260810-141955/static/becoming/domain/i18n.js`
- `.upgrade_backups/becoming-v211-high-fidelity-20260810-164345/scripts/becoming_release_gate.py`
- `.upgrade_backups/becoming-v213-trusted-ui-20260810-202200/UPGRADE_INCIDENTS.md`
- `.upgrade_backups/becoming-v215-layout-system-20260810-204314/UPGRADE_INCIDENTS.md`
- `.upgrade_backups/becoming-v2151-live-layout-20260810-211917/UPGRADE_INCIDENTS.md`
- `.upgrade_backups/learning-repository-boundary-v132-20260811-103607/README.md`
- `.upgrade_backups/learning-repository-boundary-v132-20260811-103607/SAAS_ARCHITECTURE.md`
- `.upgrade_backups/learning-repository-boundary-v132-20260811-103607/app.py`
- `.upgrade_backups/learning-repository-boundary-v132-20260811-103607/docs/PERSISTENCE_RUNTIME_READINESS.md`
- `.upgrade_backups/learning-repository-boundary-v132-20260811-103607/scripts/becoming_release_gate.py`
- `.upgrade_backups/learning-repository-boundary-v132-20260811-103607/scripts/validate_postgres_foundation.py`
- `.upgrade_backups/learning-repository-boundary-v132-r1-20260811-104126/README.md`
- `.upgrade_backups/learning-repository-boundary-v132-r1-20260811-104126/SAAS_ARCHITECTURE.md`
- `.upgrade_backups/learning-repository-boundary-v132-r1-20260811-104126/app.py`
- `.upgrade_backups/learning-repository-boundary-v132-r1-20260811-104126/docs/PERSISTENCE_RUNTIME_READINESS.md`
- `.upgrade_backups/learning-repository-boundary-v132-r1-20260811-104126/scripts/becoming_release_gate.py`
- `.upgrade_backups/learning-repository-boundary-v132-r1-20260811-104126/scripts/validate_postgres_foundation.py`
- `.upgrade_backups/persistence-readiness-v131-20260811-095521/README.md`
- `.upgrade_backups/persistence-readiness-v131-20260811-095521/SAAS_ARCHITECTURE.md`
- `.upgrade_backups/persistence-readiness-v131-20260811-095521/scripts/becoming_release_gate.py`
- `.upgrade_backups/persistence-readiness-v131-20260811-095521/scripts/validate_postgres_foundation.py`
- `.upgrade_backups/persistence-readiness-v131-20260811-095521/tests/test_platform_core.py`
- `.upgrade_backups/persistence-readiness-v131-r1-20260811-102041/README.md`
- `.upgrade_backups/persistence-readiness-v131-r1-20260811-102041/SAAS_ARCHITECTURE.md`
- `.upgrade_backups/persistence-readiness-v131-r1-20260811-102041/scripts/becoming_release_gate.py`
- `.upgrade_backups/persistence-readiness-v131-r1-20260811-102041/scripts/validate_postgres_foundation.py`
- `.upgrade_backups/persistence-readiness-v131-r1-20260811-102041/tests/test_platform_core.py`
- `.upgrade_backups/postgres-foundation-v130-20260811-081612/README.md`
- `.upgrade_backups/postgres-foundation-v130-20260811-081612/SAAS_ARCHITECTURE.md`
- `.upgrade_backups/postgres-foundation-v130-20260811-081612/compose.yaml`
- `.upgrade_backups/postgres-foundation-v130-20260811-081612/scripts/becoming_release_gate.py`
- `.upgrade_backups/postgres-foundation-v130-20260811-082612/README.md`
- `.upgrade_backups/postgres-foundation-v130-20260811-082612/SAAS_ARCHITECTURE.md`
- `.upgrade_backups/postgres-foundation-v130-20260811-082612/compose.yaml`
- `.upgrade_backups/postgres-foundation-v130-20260811-082612/scripts/becoming_release_gate.py`
- `.upgrade_backups/postgres-foundation-v130-20260811-083013/README.md`
- `.upgrade_backups/postgres-foundation-v130-20260811-083013/SAAS_ARCHITECTURE.md`
- `.upgrade_backups/postgres-foundation-v130-20260811-083013/compose.yaml`
- `.upgrade_backups/postgres-foundation-v130-20260811-083013/scripts/becoming_release_gate.py`
- `.upgrade_backups/postgres-foundation-v130-20260811-083442/README.md`
- `.upgrade_backups/postgres-foundation-v130-20260811-083442/SAAS_ARCHITECTURE.md`
- `.upgrade_backups/postgres-foundation-v130-20260811-083442/compose.yaml`
- `.upgrade_backups/postgres-foundation-v130-20260811-083442/scripts/becoming_release_gate.py`
- `.upgrade_backups/postgres-foundation-v130-20260811-084110/README.md`
- `.upgrade_backups/postgres-foundation-v130-20260811-084110/SAAS_ARCHITECTURE.md`
- `.upgrade_backups/postgres-foundation-v130-20260811-084110/compose.yaml`
- `.upgrade_backups/postgres-foundation-v130-20260811-084110/scripts/becoming_release_gate.py`
- `.upgrade_backups/specialized-persistence-v133-20260811-121622/README.md`
- `.upgrade_backups/specialized-persistence-v133-20260811-121622/SAAS_ARCHITECTURE.md`
- `.upgrade_backups/specialized-persistence-v133-20260811-121622/app.py`

### api_runtime

- `.upgrade_backups/becoming-asset-route-20260809-222651/app.py`
- `.upgrade_backups/becoming-phase4-20260809-225011/app.py`
- `.upgrade_backups/becoming-phase4-router-r1-20260809-225726/app.py`
- `.upgrade_backups/becoming-phase4-stabilize-20260809-230905/app.py`
- `.upgrade_backups/becoming-phase5-20260810-060142/app.py`
- `.upgrade_backups/becoming-phase6-20260810-062734/app.py`
- `.upgrade_backups/becoming-phase7-20260810-070014/app.py`
- `.upgrade_backups/becoming-phase8-20260810-071827/app.py`
- `.upgrade_backups/becoming-uiux-polish-20260810-090140/app.py`
- `.upgrade_backups/becoming-uiux-polish-r2-20260810-102546/app.py`
- `.upgrade_backups/becoming-v2-preview-20260809-212442/app.py`
- `.upgrade_backups/becoming-v210-combined-20260810-141955/app.py`
- `.upgrade_backups/learning-repository-boundary-v132-20260811-103607/app.py`
- `.upgrade_backups/learning-repository-boundary-v132-20260811-103607/docs/PERSISTENCE_RUNTIME_READINESS.md`
- `.upgrade_backups/learning-repository-boundary-v132-r1-20260811-104126/app.py`
- `.upgrade_backups/learning-repository-boundary-v132-r1-20260811-104126/docs/PERSISTENCE_RUNTIME_READINESS.md`
- `.upgrade_backups/specialized-persistence-v133-20260811-121622/app.py`
- `.upgrade_backups/specialized-persistence-v133-20260811-121622/docs/PERSISTENCE_RUNTIME_READINESS.md`
- `.upgrade_backups/specialized-persistence-v133-20260811-121935/app.py`
- `.upgrade_backups/specialized-persistence-v133-20260811-121935/docs/PERSISTENCE_RUNTIME_READINESS.md`
- `.upgrade_backups/specialized-persistence-v133-20260811-122835/app.py`
- `.upgrade_backups/specialized-persistence-v133-20260811-122835/docs/PERSISTENCE_RUNTIME_READINESS.md`
- `.upgrade_backups/v090-20260809-162329/app.py`
- `.upgrade_backups/v091-20260809-175435/app.py`
- `.upgrade_backups/v100-20260809-183425/app.py`
- `.upgrade_backups/v110-20260809-184527/app.py`
- `.upgrade_backups/v110-20260809-185038/app.py`
- `.upgrade_backups/v110-20260809-185038/writing_coach/languages/runtime.py`
- `.upgrade_backups/v120-20260809-193308/app.py`
- `app.py`
- `docs/PERSISTENCE_RUNTIME_READINESS.md`
- `scripts/test_m4_grammar_route_runtime.mjs`
- `scripts/validate_ai_runtime_activation.py`
- `static/becoming/api.js`
- `static/becoming/router.js`
- `test_app.py`
- `tests/test_ai_runtime.py`
- `tests/test_ai_runtime_activation.py`
- `tests/test_persistence_runtime_readiness.py`
- `writing_coach/languages/runtime.py`

## Required next gate

Do NOT mass-generate or mark lessons complete from this audit alone.

Next implementation must use this inventory to:

1. classify grammar concept families per current target language;
2. identify curriculum gaps per real configured level/framework;
3. define concept-specific required representations/practice;
4. block generic/fallback lesson bodies;
5. migrate content in large verified batches while preserving honest PENDING/BLOCKED states.

# DONE

- Repository-wide Grammar inventory.
- Static hard-placeholder test.
- Exact duplicate instructional-content report.
- Per-language/per-level completeness matrix.

# IN PROGRESS

- Audit review and concept-family classification.

# PENDING

- Curriculum-gap map.
- Concept-specific content authoring/migration.
- Cross-skill content mapping.
- Broad language/level QA.

# BLOCKED

- Full curriculum may not be called DONE until concept-specific content passes the hard gates.
