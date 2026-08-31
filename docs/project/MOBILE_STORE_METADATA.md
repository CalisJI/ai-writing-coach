# Orena Mobile Store Metadata Template

Status: **DRAFT / NOT SUBMITTED**

## Product

- Name: Orena
- Short description (EN): Practice writing, reading, listening, speaking, and grammar with server-confirmed learning evidence.
- Short description (ZH): 使用服务器确认的学习证据，练习写作、阅读、听力、口语和语法。
- Category: Education
- Supported platforms: Android and iOS
- Supported interface languages: English and Chinese
- Package/bundle identifier: `org.chillpickle.orena`

## Privacy disclosures to verify before submission

- Microphone: used only when the learner explicitly starts Speaking; recordings
  are transient and are not retained as account data by the mobile client.
- Account/session: a signed session cookie is stored in OS-backed secure storage
  and sent to the configured Orena API for authenticated requests.
- Learner content: writing, transcript, and evaluation data are sent to the
  existing authenticated product API when the learner requests the relevant
  feature; the mobile diagnostics boundary excludes this content.
- Diagnostics: no vendor is activated by this repository; the prepared schema
  contains only bounded event categories and route metadata.
- Sharing/sale: no mobile-side sale or advertising data flow is implemented.

Final store privacy answers, URLs, age rating, screenshots, and legal text need
human product/legal review before submission. This template is not a privacy
policy and does not claim production collection behavior beyond the current
implementation.
