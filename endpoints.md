# FIDE Backend API Docs

Base URL local: `http://localhost:3000`

## Response Format

Success response:

```json
{
  "success": true,
  "data": {}
}
```

Error response:

```json
{
  "success": false,
  "message": "Error message"
}
```

## Authentication

### Overview

Sistem auth pakai Supabase JWT. Alur:

1. Signup/Login -> dapat accessToken & refreshToken
2. Kirim accessToken di header Authorization untuk endpoint yang butuh auth
3. Kalau token expired, gunakan refreshToken untuk dapat token baru

Header untuk endpoint yang butuh auth:

```http
Authorization: Bearer <ACCESS_TOKEN>
```

Endpoint yang butuh auth:

- `POST /answers`
- `GET /progress`
- `GET /profile`
- `POST /progress/lesson/:lessonSlug`
- `POST /progress/content/:contentSlug`
- `POST /boss/:bossSlug/submit`

### POST /auth/signup

Daftar user baru dengan email dan password.

Body:

```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

Response `data`:

```json
{
  "user": {
    "id": "<uuid>",
    "email": "user@example.com"
  },
  "session": {
    "accessToken": "<jwt>",
    "refreshToken": "<jwt>",
    "expiresIn": 3600,
    "expiresAt": 1234567890
  },
  "message": "Signup successful. Check your email to confirm."
}
```

### POST /auth/login

Login dengan email dan password.

Body:

```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

Response `data`:

```json
{
  "user": {
    "id": "<uuid>",
    "email": "user@example.com"
  },
  "session": {
    "accessToken": "<jwt>",
    "refreshToken": "<jwt>",
    "expiresIn": 3600,
    "expiresAt": 1234567890
  }
}
```

### POST /auth/refresh

Dapatkan access token baru menggunakan refresh token.

Body:

```json
{
  "refreshToken": "<refresh_token>"
}
```

Response `data`:

```json
{
  "session": {
    "accessToken": "<jwt>",
    "refreshToken": "<jwt>",
    "expiresIn": 3600,
    "expiresAt": 1234567890
  }
}
```

## Chapters

### GET /chapters

Ambil semua chapter, urut `sort_order`.

### GET /chapters/:chapterSlug

Ambil detail 1 chapter berdasarkan slug.

Path params:

- `chapterSlug` (string)

### GET /chapters/:chapterSlug/full

Ambil chapter lengkap: sections, lessons, contents, choices, dan boss (jika ada).

Path params:

- `chapterSlug` (string)

## Sections

### GET /sections/:sectionSlug

Ambil detail 1 section berdasarkan slug.

Path params:

- `sectionSlug` (string)

### GET /chapters/:chapterSlug/sections

Ambil semua section milik chapter.

Path params:

- `chapterSlug` (string)

### GET /sections/:sectionSlug/boss

Ambil data boss untuk section.

Path params:

- `sectionSlug` (string)

## Lessons

### GET /lessons/:lessonSlug

Ambil detail lesson berdasarkan slug.

Path params:

- `lessonSlug` (string)

### GET /sections/:sectionSlug/lessons

Ambil semua lesson dalam section.

Path params:

- `sectionSlug` (string)

### GET /lessons/:lessonSlug/full

Ambil lesson beserta semua contents dan choices untuk question.

Path params:

- `lessonSlug` (string)

## Contents

### GET /contents/:contentSlug

Ambil detail 1 content berdasarkan slug.

Path params:

- `contentSlug` (string)

### GET /lessons/:lessonSlug/contents

Ambil semua content pada lesson.

Path params:

- `lessonSlug` (string)

Query params (optional):

- `type` (enum: `material` | `question`)

Contoh:

- `GET /lessons/:lessonSlug/contents?type=material`
- `GET /lessons/:lessonSlug/contents?type=question`

## Answers

### POST /answers

Submit jawaban untuk content bertipe question.

Auth: required

Body:

```json
{
	"contentSlug": "q-1-1-1",
	"selectedOption": "c"
}
```

Response `data`:

```json
{
	"contentSlug": "q-1-1-1",
	"selectedOption": "c",
	"isCorrect": true,
  "explanation": "..."
}
```

## Profile

### GET /profile

Ambil profil user saat ini, termasuk points, level, rank, dan progres menuju rank berikutnya.

Auth: required

Response `data` contoh:

```json
{
  "userId": "<uuid>",
  "points": 345,
  "level": 2,
  "rank": "Fidelis",
  "breakdown": {
    "correctAnswers": 20,
    "completedLessons": 3,
    "bossSubmissions": 1,
    "pointsPerCorrectAnswer": 10,
    "pointsPerCompletedLesson": 25,
    "pointsPerBossSubmission": 50
  },
  "nextRank": {
    "level": 3,
    "rank": "Discipulis",
    "requiredPoints": 500,
    "pointsToNextRank": 155
  }
}
```

## Progress

### GET /progress

Ambil ringkasan progress user + detail lesson/content progress.

Auth: required

### POST /progress/lesson/:lessonSlug

Upsert progress lesson user.

Auth: required

Path params:

- `lessonSlug` (string)

Body (semua optional):

```json
{
	"status": "in_progress",
	"lastContentSlug": "mat-1-1-1"
}
```

Keterangan:

- `status`: `not_started` | `in_progress` | `completed`
- `lastContentSlug` harus milik lesson yang sama.

### POST /progress/content/:contentSlug

Upsert progress content user.

Auth: required

Path params:

- `contentSlug` (string)

Body (optional):

```json
{
	"isCompleted": true
}
```

## Boss

### POST /boss/:bossSlug/submit

Submit jawaban essay/debate untuk boss.

Auth: required

Path params:

- `bossSlug` (string)

Body:

```json
{
	"answerText": "Your argument here..."
}
```

Response sukses (`201`):

```json
{
	"success": true,
	"data": {
		"id": 1,
		"user_id": "<uuid>",
		"boss_id": 1,
		"status": "submitted",
		"submitted_at": "2026-03-24T00:00:00.000Z"
	}
}
```

## Status Codes

- `200` OK
- `201` Created
- `400` Bad Request
- `401` Unauthorized
- `404` Not Found
- `500` Internal Server Error