# AI 추천 도서 자동화 — 관리자 페이지 설계 가이드

> 인스타그램 자동 업로드 프로젝트의 관리자(어드민) 페이지 구현 가이드

---

## 목차

1. [왜 관리자 페이지가 필요한가](#1-왜-관리자-페이지가-필요한가)
2. [핵심 기능 5가지](#2-핵심-기능-5가지)
3. [기술 스택](#3-기술-스택)
4. [인증 시스템](#4-인증-시스템)
5. [초안 검토 페이지](#5-초안-검토-페이지)
6. [승인 → 업로드 흐름](#6-승인--업로드-흐름)
7. [게시물 삭제 기능](#7-게시물-삭제-기능)
8. [도서 라이브러리 관리](#8-도서-라이브러리-관리)
9. [알림 시스템 연동](#9-알림-시스템-연동)
10. [자동화 수준별 접근](#10-자동화-수준별-접근)
11. [모바일 우선 설계](#11-모바일-우선-설계)
12. [최소 구현 우선순위](#12-최소-구현-우선순위)
13. [흔한 실패 케이스와 대응](#13-흔한-실패-케이스와-대응)

---

## 1. 왜 관리자 페이지가 필요한가

**"자동화 = 무인 운영"이 아닙니다.** 오히려 자동화할수록 관리자 페이지가 더 필요해요.

### 관리자 페이지 없으면 생기는 문제

**❌ 조용한 실패**
```
토큰이 60일 만료 → 업로드 실패
근데 아무도 모름 → 2주 동안 게시물 0개
팔로워 "이 계정 죽었네" → 언팔
```

**❌ 할루시네이션 전파**
```
AI가 책 내용을 지어냄 → 자동 업로드
팔로워가 "이 책 그런 내용 아닌데?" 댓글
다른 게시물도 의심받음 → 신뢰 붕괴
```

**❌ 동일 콘텐츠 반복**
```
DB 버그로 같은 책 3일 연속 업로드
알고리즘이 스팸 의심 → 도달 급감
```

**❌ 비용 폭탄**
```
AI 호출 루프 버그 → 밤새 API 5000회 호출
아침에 보니 청구서 $200
```

**관리자 페이지 + 알림**만 있으면 위 4가지 다 조기 감지 가능합니다.

### 관리자 페이지 있을 때의 실제 운영 시나리오

```
오전 6시 - AI가 오늘의 책 초안 생성
오전 7시 - Slack 알림: "오늘의 책 초안 준비됨"
오전 7시 05분 - 폰으로 관리자 페이지 열어서 확인
                → 어라, 책 제목이 이상하게 잘렸네
                → 승인 거부, 다른 책으로 재생성 버튼 클릭
오전 7시 10분 - 새 초안 확인 → 승인
오전 9시 - 자동 업로드 완료
```

**하루 총 투자 시간: 2~3분**. 이게 가장 효율적인 자동화 운영 방식이에요.

---

## 2. 핵심 기능 5가지

### 기능 1: 초안 검토 (가장 중요)

```
┌─────────────────────────────────────┐
│  📚 오늘의 책 초안                  │
│  생성 시각: 2026-04-21 06:00        │
│                                     │
│  제목: 《정원의 말들》               │
│  저자: 김OO                          │
│  선정 이유: 월요일 테마 "에너지 충전" │
│                                     │
│  [미리보기 - 7장 캐러셀]            │
│  ◀ [1/7] [2/7] [3/7] ... [7/7] ▶  │
│                                     │
│  캡션: "월요일 아침을..."            │
│  해시태그: #책추천 #월요일의책 ...   │
│                                     │
│  ⚠️ 자동 검증 결과                  │
│  ✅ 저작권 체크 통과 (인용 23자)    │
│  ✅ 스포일러 없음                   │
│  ⚠️ "반드시"라는 단정적 표현 포함   │
│                                     │
│  [✅ 승인 & 업로드]  [❌ 거부]       │
│  [🔄 다른 책으로 재생성]             │
│  [✏️ 직접 수정]                      │
└─────────────────────────────────────┘
```

### 기능 2: 도서 라이브러리 관리

- 책 수동 추가·제거
- 저자 요청 시 "사용 금지" 플래그
- 사용 이력·주기 관리
- 검색·필터 기능

### 기능 3: 예약·발행 관리

- 캘린더 뷰로 발행 일정 확인
- 특정 날짜에 수동 예약
- 휴가 중 자동화 일시 중지

### 기능 4: 성과 분석 대시보드

- 이번 주/월 도달·저장·팔로워
- 카테고리·요일별 성과
- AI 기반 인사이트 자동 생성

### 기능 5: 설정·프롬프트 관리

- 콘텐츠 생성 프롬프트 편집
- 디자인 템플릿 설정
- 토큰·API 키 관리

---

## 3. 기술 스택

### 추천 구성

```
Next.js 15 App Router
├── /app
│   ├── (admin)/              ← 관리자 전용 라우트 그룹
│   │   ├── layout.tsx         ← 인증 체크 공통
│   │   ├── drafts/            ← 초안 검토
│   │   ├── posts/             ← 발행된 게시물 관리
│   │   ├── books/             ← 도서 관리
│   │   ├── calendar/          ← 발행 일정
│   │   ├── analytics/         ← 성과 분석
│   │   └── settings/          ← 설정
│   └── api/
│       ├── cron/              ← 자동 실행 (Vercel Cron)
│       ├── drafts/            ← 초안 CRUD
│       ├── publish/           ← 인스타 업로드
│       └── posts/             ← 게시물 관리·삭제
```

### 라이브러리

```
[UI]
- shadcn/ui                   ← 기본 컴포넌트
- Tailwind CSS                ← 스타일링
- Lucide React                ← 아이콘

[인증]
- NextAuth.js v5 (Auth.js)    ← Google/이메일 로그인
- 또는 Clerk                  ← 더 간편한 대안

[데이터]
- Supabase                    ← DB + 인증 통합 가능
- Drizzle ORM 또는 Prisma    ← 타입 안전 DB 접근

[폼·검증]
- React Hook Form             ← 폼 관리
- Zod                         ← 스키마 검증
```

---

## 4. 인증 시스템

### 나만 접근 가능하게 만들기

```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function middleware(request: Request) {
  if (request.url.includes('/admin')) {
    const session = await auth()
    
    // 허용된 이메일만
    const allowed = process.env.ADMIN_EMAILS?.split(',') || []
    if (!session || !allowed.includes(session.user.email)) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*']
}
```

### 추천 인증 방식

| 상황 | 추천 |
|------|------|
| 혼자 쓸 때 | Google OAuth (NextAuth) |
| 간단하게 | 환경변수 비밀번호 |
| 스마트폰 관리 | 매직링크 이메일 로그인 |
| 팀으로 운영 | Clerk (역할 관리 편함) |

### 환경변수 예시

```env
# .env.local
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://yourdomain.com

# Google OAuth
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx

# 관리자 이메일 (쉼표 구분)
ADMIN_EMAILS=you@gmail.com,backup@gmail.com

# Instagram
IG_USER_ID=17841xxx
IG_ACCESS_TOKEN=xxx

# AI
ANTHROPIC_API_KEY=xxx
OPENAI_API_KEY=xxx

# Storage
CLOUDINARY_URL=xxx
```

---

## 5. 초안 검토 페이지

### 페이지 구조

```typescript
// app/(admin)/drafts/page.tsx
export default async function DraftsPage() {
  const drafts = await db.drafts.findMany({
    where: { status: 'pending_review' },
    orderBy: { createdAt: 'desc' }
  })
  
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">
        검토 대기 초안 ({drafts.length})
      </h1>
      
      {drafts.map(draft => (
        <DraftCard key={draft.id} draft={draft} />
      ))}
    </div>
  )
}
```

### 초안 카드 컴포넌트

```typescript
// components/DraftCard.tsx
'use client'

import { useState } from 'react'
import { CarouselPreview } from './CarouselPreview'
import { ValidationResults } from './ValidationResults'

export function DraftCard({ draft }) {
  const [loading, setLoading] = useState(false)
  
  async function handleAction(action: 'approve' | 'reject' | 'regenerate') {
    setLoading(true)
    try {
      const res = await fetch(`/api/drafts/${draft.id}/${action}`, {
        method: 'POST'
      })
      if (res.ok) {
        window.location.reload()
      }
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="border rounded-lg p-6 mb-4">
      <div className="flex justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold">《{draft.bookTitle}》</h2>
          <p className="text-gray-600">{draft.bookAuthor}</p>
        </div>
        <span className="text-sm text-gray-500">
          {new Date(draft.createdAt).toLocaleString()}
        </span>
      </div>
      
      <p className="mb-4 italic">"{draft.selectionReason}"</p>
      
      {/* 7장 캐러셀 미리보기 */}
      <CarouselPreview images={draft.imageUrls} />
      
      {/* 캡션 */}
      <div className="mt-4 p-3 bg-gray-50 rounded">
        <p className="whitespace-pre-wrap">{draft.caption}</p>
        <p className="text-blue-600 mt-2">
          {draft.hashtags.join(' ')}
        </p>
      </div>
      
      {/* 자동 검증 결과 */}
      <ValidationResults validation={draft.validation} />
      
      {/* 액션 버튼 */}
      <div className="flex gap-2 mt-4">
        <button 
          onClick={() => handleAction('approve')}
          disabled={loading}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          ✅ 승인 & 업로드
        </button>
        <button 
          onClick={() => handleAction('regenerate')}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          🔄 재생성
        </button>
        <button 
          onClick={() => handleAction('reject')}
          disabled={loading}
          className="bg-red-600 text-white px-4 py-2 rounded"
        >
          ❌ 거부
        </button>
      </div>
    </div>
  )
}
```

### 자동 검증 로직

```typescript
// lib/validation.ts
import { generateObject } from 'ai'
import { z } from 'zod'

export async function validateDraft(draft: Draft): Promise<ValidationResult> {
  const issues: Issue[] = []
  
  // 1. 저작권 체크 — 인용 문자 수
  const quoteLength = extractQuotes(draft.caption).reduce(
    (sum, q) => sum + q.length, 0
  )
  if (quoteLength > 30) {
    issues.push({
      level: 'warning',
      message: `인용 문자 수 초과 (${quoteLength}/30자)`
    })
  }
  
  // 2. 할루시네이션 체크 (2차 LLM 검증)
  const factCheck = await generateObject({
    model: 'openai/gpt-5.2',
    schema: z.object({
      isAccurate: z.boolean(),
      suspiciousClaims: z.array(z.string())
    }),
    prompt: `
      원본 출판사 소개: ${draft.originalDescription}
      생성된 콘텐츠: ${draft.content}
      
      원본에 없는 주장·수치·인용이 있는지 체크해줘.
    `
  })
  
  if (!factCheck.object.isAccurate) {
    issues.push({
      level: 'error',
      message: `할루시네이션 의심: ${factCheck.object.suspiciousClaims.join(', ')}`
    })
  }
  
  // 3. 금지어 체크
  const bannedWords = ['반드시', '최고', '유일한', '절대']
  const found = bannedWords.filter(w => draft.content.includes(w))
  if (found.length > 0) {
    issues.push({
      level: 'info',
      message: `단정적 표현 포함: ${found.join(', ')}`
    })
  }
  
  // 4. 이미지 개수 검증
  if (draft.imageUrls.length !== 7) {
    issues.push({
      level: 'error',
      message: `이미지 개수 불일치 (${draft.imageUrls.length}/7)`
    })
  }
  
  return { 
    passed: issues.every(i => i.level !== 'error'), 
    issues 
  }
}
```

---

## 6. 승인 → 업로드 흐름

### 전체 흐름

```
[관리자 페이지]              [백엔드]              [외부 서비스]
                                                          
 승인 버튼 클릭      →    API 엔드포인트 호출              
    (사용자)              POST /api/publish/:id           
                                 ↓                         
                          1. DB에서 초안 조회               
                                 ↓                         
                          2. 이미지를 Cloudinary 업로드  →  [Cloudinary]
                                 ↓                         
                          3. Instagram Graph API           
                             캐러셀 생성 호출       →   [Meta API]
                                 ↓                         
                          4. 발행(publish) 호출    →   [Meta API]
                                 ↓                              ↓
                          5. DB에 발행 완료 기록        [인스타에 게시물]
                                 ↓                         
    성공 화면 표시    ←    응답 반환                       
```

### API 엔드포인트 구현

```typescript
// app/api/publish/[id]/route.ts
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  // 1. 인증
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: '권한 없음' }, { status: 401 })
  }
  
  // 2. 초안 조회
  const draft = await db.drafts.findUnique({ where: { id: params.id } })
  if (!draft || draft.status !== 'pending_review') {
    return NextResponse.json({ error: '유효하지 않은 초안' }, { status: 400 })
  }
  
  try {
    // 3. 각 이미지를 미디어 컨테이너로 등록
    const mediaIds = await Promise.all(
      draft.imageUrls.map(async (imageUrl) => {
        const res = await fetch(
          `https://graph.facebook.com/v21.0/${process.env.IG_USER_ID}/media`,
          {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.IG_ACCESS_TOKEN}`
            },
            body: JSON.stringify({
              image_url: imageUrl,
              is_carousel_item: true,
            })
          }
        )
        const data = await res.json()
        if (data.error) throw new Error(data.error.message)
        return data.id
      })
    )
    
    // 4. 캐러셀 컨테이너 생성
    const carouselRes = await fetch(
      `https://graph.facebook.com/v21.0/${process.env.IG_USER_ID}/media`,
      {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.IG_ACCESS_TOKEN}`
        },
        body: JSON.stringify({
          media_type: 'CAROUSEL',
          children: mediaIds.join(','),
          caption: `${draft.caption}\n\n${draft.hashtags.join(' ')}`,
        })
      }
    )
    const { id: carouselId } = await carouselRes.json()
    
    // 5. 발행
    const publishRes = await fetch(
      `https://graph.facebook.com/v21.0/${process.env.IG_USER_ID}/media_publish`,
      {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.IG_ACCESS_TOKEN}`
        },
        body: JSON.stringify({ creation_id: carouselId })
      }
    )
    const { id: postId } = await publishRes.json()
    
    // 6. DB 기록
    await db.drafts.update({
      where: { id: draft.id },
      data: { 
        status: 'published',
        publishedAt: new Date(),
        instagramPostId: postId,
      }
    })
    
    await db.books.update({
      where: { id: draft.bookId },
      data: { used_at: new Date() }
    })
    
    return NextResponse.json({ 
      success: true, 
      postId,
      postUrl: `https://instagram.com/p/${postId}` 
    })
    
  } catch (error) {
    await db.drafts.update({
      where: { id: draft.id },
      data: { status: 'failed', errorMessage: error.message }
    })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

### 실패 시 재시도 로직

```typescript
async function publishWithRetry(draftId: string, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await publishDraft(draftId)
    } catch (error) {
      if (isRetryableError(error) && attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1000 * attempt))
        continue
      }
      
      await notifyFailure(draftId, error)
      throw error
    }
  }
}

function isRetryableError(error: any): boolean {
  const retryableCodes = [500, 502, 503, 504]
  return retryableCodes.includes(error.status)
}
```

### 승인 흐름의 변형

| 옵션 | 동작 |
|------|------|
| **즉시 업로드** | 클릭 즉시 인스타에 게시 |
| **예약 업로드** | 지정 시간에 자동 업로드 (Vercel Cron) |
| **승인 + 수정** | 캡션·해시태그 편집 후 업로드 |
| **부분 승인** | 7장 중 일부 슬라이드만 사용 |

---

## 7. 게시물 삭제 기능

### 삭제의 3가지 종류

| 삭제 방식 | 용도 | API 지원 |
|----------|------|---------|
| **인스타 게시물 삭제** | 실제 올라간 포스트 제거 | ✅ 가능 |
| **초안 거부** | 업로드 전 초안 버리기 | ✅ 가능 |
| **숨김 처리 (아카이브)** | 보관하되 노출만 차단 | ❌ 앱에서만 |

### 인스타 게시물 삭제 API

```typescript
// app/api/posts/[id]/delete/route.ts
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '권한 없음' }, { status: 401 })
  
  const body = await request.json()
  const { reason } = body
  
  const post = await db.posts.findUnique({ where: { id: params.id } })
  
  // Meta API DELETE 호출
  const res = await fetch(
    `https://graph.facebook.com/v21.0/${post.instagramPostId}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${process.env.IG_ACCESS_TOKEN}` }
    }
  )
  
  if (res.ok) {
    // 소프트 삭제 (DB 기록 유지)
    await db.posts.update({
      where: { id: params.id },
      data: { 
        status: 'deleted',
        deletedAt: new Date(),
        deletedReason: reason,
        deletedBy: session.user.email,
      }
    })
    
    return NextResponse.json({ success: true })
  }
  
  return NextResponse.json({ error: '삭제 실패' }, { status: 500 })
}
```

### 안전 삭제 UI

```typescript
function DeleteButton({ postId }) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [reason, setReason] = useState('')
  
  async function handleDelete() {
    if (!reason) {
      alert('삭제 이유를 선택해주세요')
      return
    }
    
    const confirmed = confirm(
      '정말 삭제하시겠습니까? 이 작업은 복구 불가능합니다.'
    )
    if (!confirmed) return
    
    await fetch(`/api/posts/${postId}/delete`, { 
      method: 'DELETE',
      body: JSON.stringify({ reason })
    })
    
    alert('삭제되었습니다')
    window.location.reload()
  }
  
  return (
    <div>
      <button 
        onClick={() => setShowConfirm(true)}
        className="bg-red-600 text-white px-4 py-2 rounded"
      >
        🗑️ 삭제
      </button>
      
      {showConfirm && (
        <Modal>
          <h3 className="text-xl font-bold">⚠️ 게시물 삭제</h3>
          <p className="text-gray-600 my-2">
            이 작업은 되돌릴 수 없습니다.
          </p>
          
          <label className="block mt-4">
            <span>삭제 이유 (기록용)</span>
            <select 
              value={reason} 
              onChange={e => setReason(e.target.value)}
              className="w-full border rounded p-2"
            >
              <option value="">선택...</option>
              <option value="copyright">저작권자 요청</option>
              <option value="error">내용 오류</option>
              <option value="author_request">저자 요청</option>
              <option value="quality">품질 이슈</option>
              <option value="other">기타</option>
            </select>
          </label>
          
          <div className="flex gap-2 mt-4">
            <button 
              onClick={handleDelete}
              className="bg-red-600 text-white px-4 py-2 rounded"
            >
              삭제 확정
            </button>
            <button 
              onClick={() => setShowConfirm(false)}
              className="border px-4 py-2 rounded"
            >
              취소
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
```

### 일괄 삭제 — 긴급 상황 대응

```typescript
// 특정 책 관련 게시물 전체 삭제
async function deleteAllPostsForBook(bookId: string, reason: string) {
  const posts = await db.posts.findMany({
    where: { bookId, status: 'published' }
  })
  
  const results = []
  
  for (const post of posts) {
    try {
      await deleteInstagramPost(post.instagramPostId)
      await db.posts.update({
        where: { id: post.id },
        data: { 
          status: 'deleted',
          deletedAt: new Date(),
          deletedReason: reason
        }
      })
      results.push({ id: post.id, success: true })
    } catch (error) {
      results.push({ id: post.id, success: false, error: error.message })
    }
    
    // API 레이트 리밋 방지
    await new Promise(r => setTimeout(r, 1000))
  }
  
  // 해당 책을 "사용 금지"
  await db.books.update({
    where: { id: bookId },
    data: { blocked: true, blockedReason: reason }
  })
  
  return results
}
```

### 긴급 삭제 시나리오

**시나리오 1: 저자가 DM으로 항의**
```
11:30 - 저자 DM "내 책 게시물 내려주세요"
11:31 - 관리자 페이지 접속 (폰)
11:32 - 해당 책 검색 → 발행 이력 확인
11:33 - "이 책 관련 모두 삭제" 클릭
11:34 - 인스타에서 게시물 사라짐
11:35 - 저자에게 답장 "처리 완료, 향후 제외 조치했습니다"
```
**총 5분.** 신속 대응이 분쟁 방지의 핵심입니다.

### 소프트 삭제 패턴

```typescript
// ❌ 하드 삭제 (복구 불가)
await db.posts.delete({ where: { id } })

// ✅ 소프트 삭제 (기록 남김)
await db.posts.update({
  where: { id },
  data: {
    status: 'deleted',
    deletedAt: new Date(),
    deletedBy: session.user.id,
    deletedReason: reason,
  }
})
```

**소프트 삭제 이유**
- 실수 복구 가능 (관리자 페이지에서 이력 확인)
- 법적 증거 보존 (저작권 분쟁 시 "삭제 요청에 응했다" 증명)
- 패턴 분석 (어떤 이유로 삭제가 많은지)
- 감사 추적 (누가 언제 왜 삭제했는지)

### Meta API 제약

- **본인 계정 게시물만** 삭제 가능
- 앱 권한: `instagram_content_publish` (업로드 권한에 포함)
- 실시간 삭제지만 CDN 캐시로 피드에서 몇 분 남아 보일 수 있음
- **1년 이상 된 게시물**은 API 삭제 안 될 수 있음 (앱에서 수동)
- 아카이브(보관)는 API 미지원, 앱에서만 가능

### 24시간 예약 삭제 (안전장치)

```typescript
// 즉시 삭제 대신 "24시간 후 삭제 예약"
async function scheduleDelete(postId: string, reason: string) {
  await db.posts.update({
    where: { id: postId },
    data: {
      status: 'pending_delete',
      scheduledDeleteAt: addHours(new Date(), 24),
      deleteReason: reason
    }
  })
  
  await sendNotification({
    message: `${postId} 삭제 예약됨. 24시간 내 취소 가능.`,
    cancelUrl: `/admin/posts/${postId}/cancel-delete`
  })
}

// Cron이 24시간 후 실제 삭제 실행
// 단, 저작권자 요청 같은 건 즉시 삭제
```

### 댓글 관리 API

```typescript
// 댓글 숨기기
await fetch(
  `https://graph.facebook.com/v21.0/${commentId}`,
  {
    method: 'POST',
    body: JSON.stringify({ hide: true })
  }
)

// 댓글 삭제
await fetch(
  `https://graph.facebook.com/v21.0/${commentId}`,
  { method: 'DELETE' }
)
```

### 삭제 이력 대시보드

```
┌─────────────────────────────────┐
│  🗑️ 삭제 이력 (최근 30일)       │
│                                 │
│  2026-04-18 《어제의 빛》        │
│  사유: 저자 요청                 │
│  담당: admin@you.com             │
│                                 │
│  2026-04-15 《알 수 없는 책》    │
│  사유: 내용 오류                 │
│  담당: admin@you.com             │
│                                 │
│  📊 이달 삭제: 3건               │
│  - 저자 요청: 1                  │
│  - 내용 오류: 1                  │
│  - 품질 이슈: 1                  │
└─────────────────────────────────┘
```

**패턴 파악**에 유용합니다. "내용 오류"가 많으면 AI 프롬프트 개선이 필요하다는 신호.

---

## 8. 도서 라이브러리 관리

### 페이지 UI

```
┌─────────────────────────────────────┐
│  📖 책 데이터베이스 (전체 523권)    │
│                                     │
│  [검색: 키워드, 카테고리, 저자]     │
│  [필터: 미사용 / 사용완료 / 제외]   │
│                                     │
│  □ 책 A - 마지막 사용: 3개월 전     │
│  □ 책 B - 미사용                    │
│  □ 책 C - 제외 (저자 요청)          │
│  ...                                │
│                                     │
│  [+ 신규 도서 수집 (알라딘 API)]    │
│  [+ ISBN으로 직접 추가]             │
└─────────────────────────────────────┘
```

### 주요 액션

- **검색·필터**: 제목, 저자, 카테고리, 사용 상태로 필터링
- **수동 추가**: ISBN으로 알라딘에서 정보 가져와 DB 추가
- **사용 금지 플래그**: 저자·출판사 요청 시 체크
- **일괄 재임베딩**: 카테고리 변경 시 전체 재처리

---

## 9. 알림 시스템 연동

관리자 페이지만 있으면 **"매일 확인하러 들어가야" 해서** 피곤해집니다. 알림과 묶어야 효율적이에요.

### Slack 웹훅 연동

```typescript
// 초안 생성 완료 시
async function notifyNewDraft(draft: Draft) {
  await fetch(process.env.SLACK_WEBHOOK_URL, {
    method: 'POST',
    body: JSON.stringify({
      text: `📚 오늘의 책 초안 준비됨`,
      blocks: [
        {
          type: 'section',
          text: { 
            type: 'mrkdwn', 
            text: `*${draft.bookTitle}*\n${draft.reason}` 
          }
        },
        {
          type: 'image',
          image_url: draft.imageUrls[0],
          alt_text: 'Cover preview'
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: '🔗 검토하기' },
              url: `${process.env.SITE_URL}/admin/drafts/${draft.id}`
            }
          ]
        }
      ]
    })
  })
}
```

### 알림이 필요한 이벤트

- ✅ **새 초안 생성** — 매일 아침 검토 리마인더
- ✅ **업로드 성공** — 게시 완료 확인
- ⚠️ **업로드 실패** — 즉시 대응 필요
- ⚠️ **토큰 만료 임박** — 60일 주기
- ⚠️ **비용 임계치 초과** — AI 호출 비용 이상
- 📊 **주간 성과 리포트** — 매주 월요일

### 통합 가능한 채널

- Slack (가장 개발자 친화적)
- Discord (웹훅 간편)
- 카카오톡 채널 (한국 사용 시)
- 이메일 (중요 알림용)
- SMS (긴급 알림용, Twilio 등)

---

## 10. 자동화 수준별 접근

### Level 1: 반자동 (초기 1~3개월)

```
AI가 초안 생성 → Slack 알림 → 관리자 페이지에서 검토 
→ 승인 버튼 → 자동 업로드
```

- 사람 개입 필수
- 품질 안정화 기간
- 하루 2~3분 투자
- **추천 시작점**

### Level 2: 조건부 자동 (3~6개월)

```
검증 점수 90점 이상 → 자동 승인·업로드
검증 점수 70~89점 → 관리자 알림 후 검토
검증 점수 70점 미만 → 자동 거부, 재생성
```

- 신뢰할 수 있는 패턴 생기면 점진적 자동화
- "명확히 좋은 것"만 자동 통과
- **현실적 최적점**

### Level 3: 완전 자동 (6개월+, 선택)

```
AI가 생성 → 자동 검증 → 자동 업로드
사람은 사후 모니터링만
```

- 계정 안정화 후
- 여전히 주 1회 성과 리뷰 필요
- **권장하지 않음** (예외 상황 대응 어려움)

### 레벨별 코드 구조

```typescript
async function handleNewDraft(draft: Draft) {
  const validation = await validateDraft(draft)
  const score = calculateScore(validation)
  
  // Level 2 로직
  if (score >= 90) {
    // 자동 승인·업로드
    await publishDraft(draft.id)
    await notify(`✅ 자동 업로드 완료: ${draft.bookTitle}`)
  } else if (score >= 70) {
    // 관리자 검토 필요
    await notifyNewDraft(draft)
  } else {
    // 자동 거부
    await db.drafts.update({
      where: { id: draft.id },
      data: { status: 'auto_rejected', reason: '검증 점수 미달' }
    })
    await notify(`⚠️ 자동 거부됨: ${draft.bookTitle}`)
    // 다른 책으로 재시도
    await regenerateDraft()
  }
}
```

---

## 11. 모바일 우선 설계

관리자 페이지를 **폰에서 관리할 수 있게** 만드는 게 실용적입니다. 아침에 침대에서 폰으로 승인할 수 있어야 지속 가능해요.

### 모바일 레이아웃

```
[모바일 관리자 페이지 핵심 화면]

┌─────────────────┐
│ 오늘의 초안 📚   │
│                 │
│ 《책 제목》      │
│                 │
│ [표지 미리보기]  │
│                 │
│ 슬라이드 1~7     │
│ ◀──────────▶   │
│                 │
│ 캡션 요약 120자  │
│                 │
│ ✅ 검증 통과     │
│                 │
│ ╔═══════════╗   │
│ ║ 승인 & 업로드║  │
│ ╚═══════════╝   │
│                 │
│ [거부] [재생성]  │
└─────────────────┘
```

### 모바일 최적화 포인트

- **터치 영역**: 버튼 최소 44×44px
- **스와이프**: 캐러셀 미리보기는 스와이프로 탐색
- **세로 스크롤**: 모든 정보를 세로로 쌓기
- **고정 액션 바**: 화면 하단에 승인·거부 버튼 고정
- **읽기 편한 폰트**: 본문 16px 이상
- **오프라인 대응**: 네트워크 끊겨도 검토는 가능하게

### 반응형 CSS

```tsx
<div className="
  max-w-4xl mx-auto p-4 
  md:p-6 
  lg:grid lg:grid-cols-[1fr_300px] lg:gap-6
">
  <main>
    {/* 초안 내용 */}
  </main>
  
  <aside className="
    fixed bottom-0 left-0 right-0 bg-white border-t p-4 z-10
    lg:static lg:border-0 lg:p-0
  ">
    {/* 액션 버튼 */}
  </aside>
</div>
```

---

## 12. 최소 구현 우선순위

시간이 부족하면 이것만 먼저:

### 1순위 (필수, 1주차)
- ✅ **초안 승인 페이지** — 승인/거부/재생성 버튼
- ✅ **Slack/Discord 알림** — 새 초안 생성 시
- ✅ **오류 알림** — Cron 실패 시
- ✅ **인증** — 나만 접근 가능

### 2순위 (3개월 내)
- ✅ **발행된 게시물 목록** — 삭제 기능 포함
- ✅ **도서 목록 페이지** — 검색·필터
- ✅ **토큰 만료 알림** — 60일 전

### 3순위 (여유 되면)
- 📊 **성과 대시보드**
- ✏️ **프롬프트 편집기**
- 📅 **캘린더 뷰**
- 🤖 **자동 승인 로직 (Level 2)**

**1순위만 있어도 안정적 운영 가능**합니다.

---

## 13. 흔한 실패 케이스와 대응

### 케이스 1: 토큰 만료
```
증상: 업로드가 갑자기 실패
원인: 60일 장기 토큰 만료
대응: 
  1. 관리자 페이지 토큰 상태 표시
  2. 만료 30일 전부터 매일 알림
  3. 재발급 버튼 UI 제공
```

### 케이스 2: 이미지 업로드 실패
```
증상: Cloudinary는 올라갔는데 Meta가 거부
원인: 이미지 용량·비율·URL 접근 문제
대응:
  1. 각 단계별 로그 기록
  2. 어느 단계에서 실패했는지 표시
  3. 수동 재시도 버튼
```

### 케이스 3: AI API 오류
```
증상: 초안 생성 단계에서 실패
원인: 레이트 리밋, API 키 문제, 서비스 장애
대응:
  1. 폴백 모델 자동 전환 (Claude → GPT)
  2. 재시도 로직 (지수 백오프)
  3. 실패 시 전날 초안 중 미사용 것 활용
```

### 케이스 4: DB 연결 끊김
```
증상: 관리자 페이지 자체가 안 열림
원인: Supabase 장애, 연결 수 초과
대응:
  1. Vercel 에러 로그 확인
  2. Supabase 상태 페이지 모니터링
  3. Sentry 같은 에러 추적 도구 연동
```

### 케이스 5: 승인 버튼 2번 클릭
```
증상: 같은 게시물이 2번 올라감
원인: 더블 클릭, 느린 응답에 재시도
대응:
  1. 버튼 클릭 시 즉시 비활성화
  2. DB에 "업로드 진행 중" 플래그
  3. 중복 업로드 방지 idempotency key
```

---

## 전체 개발 일정 예시

기존 4주 MVP 계획에 관리자 페이지를 녹인 버전:

### 1주차: 기반 + 인증
- Next.js 프로젝트 셋업
- Supabase DB 스키마
- NextAuth로 Google 로그인
- `/admin` 라우트 보호

### 2주차: AI 파이프라인 + 초안 구조
- 알라딘 API 연동
- AI로 초안 생성
- 초안을 DB에 저장 (`pending_review` 상태)
- Slack 웹훅 연동

### 3주차: 초안 검토 페이지
- `/admin/drafts` 페이지
- 캐러셀 미리보기 컴포넌트
- 자동 검증 로직
- 승인·거부·재생성 버튼

### 4주차: 업로드·삭제·자동화
- `/api/publish/:id` 엔드포인트
- `/api/posts/:id/delete` 엔드포인트
- Vercel Cron으로 매일 초안 자동 생성
- 발행된 게시물 목록 페이지

**이 일정으로 가면 4주 후에 완전히 작동하는 시스템**이 나옵니다.

---

## 포트폴리오 관점에서의 가치

관리자 페이지는 **이 프로젝트의 포트폴리오 가치를 200% 올려줍니다**. 이유:

- **풀스택 역량** — 단순 AI 호출이 아니라 시스템
- **프로덕션 감각** — 모니터링, 예외 처리 이해
- **UI/UX 감각** — 내부 도구도 잘 만듦
- **데이터 설계 역량** — DB 구조, 상태 관리
- **보안 의식** — 인증, 권한 관리

면접에서 "어떻게 운영하셨어요?" 질문에 **"이런 관리자 페이지로 하루 2분 투자로 운영했다"** 답변이 훨씬 설득력 있어요.

### 증명되는 기술 역량

- ✅ Next.js App Router + Server Components
- ✅ 인증 시스템 (NextAuth/Clerk)
- ✅ DB 설계 및 ORM 활용
- ✅ 외부 API 통합 (Meta, Cloudinary, Slack)
- ✅ 에러 처리·재시도 로직
- ✅ 모바일 반응형 UI
- ✅ 실시간 알림 시스템
- ✅ 관측성·로깅

---

## 핵심 정리

1. **관리자 페이지는 필수**다. 자동화일수록 더 필요
2. **초안 검토 페이지**부터 만들어라. 나머지는 나중
3. **Slack 알림**과 묶어야 지속 가능
4. **모바일 우선**으로 설계하라
5. **삭제는 항상 소프트 삭제** + 확인 모달
6. **Level 1(반자동)로 시작**해서 Level 2로 진화
7. **실패 대응 로직**을 처음부터 넣어라

> 자동화의 핵심은 **"사람을 없애는 것"**이 아니라 **"사람이 중요한 것에만 집중하게 하는 것"**입니다. 관리자 페이지가 그걸 가능하게 합니다.

---

*이 문서는 AI 추천 도서 인스타 자동화 프로젝트의 관리자 페이지 설계 가이드입니다. 본 가이드(`AI_추천도서_인스타_자동화_가이드.md`)와 함께 참고하세요.*
