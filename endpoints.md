GET    /chapters
GET    /chapters/:chapterSlug
GET    /chapters/:chapterSlug/full

GET    /sections/:sectionSlug
GET    /chapters/:chapterSlug/sections

GET    /lessons/:lessonSlug
GET    /sections/:sectionSlug/lessons
GET    /lessons/:lessonSlug/full

GET    /contents/:contentSlug
GET    /lessons/:lessonSlug/contents
GET    /lessons/:lessonSlug/contents?type=material
GET    /lessons/:lessonSlug/contents?type=question

POST   /answers

GET    /progress
POST   /progress/lesson/:lessonSlug
POST   /progress/content/:contentSlug

GET    /sections/:sectionSlug/boss
POST   /boss/:bossSlug/submit