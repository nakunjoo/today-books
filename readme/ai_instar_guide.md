# AI 추천 도서 인스타 자동화 프로젝트 가이드

> 프론트엔드 개발자를 위한 포트폴리오급 AI 자동화 프로젝트 설계서

---

## 목차

1. [왜 "추천 도서" 주제가 좋은가](#1-왜-추천-도서-주제가-좋은가)
2. [콘셉트 정하기 — 차별화 포인트](#2-콘셉트-정하기--차별화-포인트)
3. [전체 시스템 아키텍처](#3-전체-시스템-아키텍처)
4. [1단계: 책 데이터 수집](#4-1단계-책-데이터-수집)
5. [2단계: 오늘의 책 선정 로직](#5-2단계-오늘의-책-선정-로직)
6. [3단계: 카드 콘텐츠 생성](#6-3단계-카드-콘텐츠-생성)
7. [4단계: 카드 디자인](#7-4단계-카드-디자인)
8. [5단계: 업로드 자동화](#8-5단계-업로드-자동화)
9. [6단계: 성과 추적 + 학습 루프](#9-6단계-성과-추적--학습-루프)
10. [4주 MVP 계획](#10-4주-mvp-계획)
11. [콘텐츠 풀 마르지 않게 하는 팁](#11-콘텐츠-풀-마르지-않게-하는-팁)
12. [수익화 경로](#12-수익화-경로)
13. [저작권 주의사항 (상세)](#13-저작권-주의사항-상세)
14. [마지막 조언](#14-마지막-조언)

---

## 1. 왜 "추천 도서" 주제가 좋은가

### ① 콘텐츠 소스가 풍부
- 신간은 매주 수백 권 쏟아짐 → 소재 마르지 않음
- 고전은 수만 권 → 영원한 재고
- 책 정보는 공개 API 많음 (저작권 부담 적음)

### ② AI가 특히 잘하는 영역
- 책 요약·핵심 정리 = LLM 특기
- 개인화 추천 = AI 장점
- 문장 발췌·감상 포인트 = 잘 만들어냄

### ③ 인스타와 궁합 최고
- 책 표지 = 그 자체로 좋은 비주얼
- "읽기 전 훑어보는" 소비 패턴에 딱
- 저장률·공유율이 높은 카테고리

### ④ 뉴스와 달리 시의성 부담 없음
- 하루 늦게 올려도 가치 안 떨어짐
- 검증 압박이 덜함 (할루시네이션 리스크 낮음)

---

## 2. 콘셉트 정하기 — 차별화 포인트

"오늘의 추천 도서"는 이미 많은 계정이 있어요. 차별화하려면 **테마를 좁히는 게** 핵심입니다.

### 예시 콘셉트들

| 콘셉트 | 타겟 | 난이도 |
|--------|------|--------|
| "개발자를 위한 오늘의 책" | 개발자 | 하 |
| "30대 직장인이 읽을 만한 책" | 직장인 | 중 |
| "오늘의 문장" (책 속 좋은 구절 큐레이션) | 범용 | 하 |
| "이 책을 읽어야 할 사람" (상황별 추천) | 범용 | 중 |
| "신간 알림 - 이번 주 주목할 책" | 독서가 | 중 |
| "주제별 3권" (불안, 리더십, 자기계발 등) | 범용 | 중 |
| "읽기 전 요약" (읽을지 말지 판단) | 바쁜 사람 | 상 |
| "1분 책 소개" (릴스 중심) | MZ | 상 |

### 추천 콘셉트: "상황별 1권 추천"

요일별 테마가 있으면 **재방문율**이 훨씬 높아집니다.

- **월**: 월요병 날리는 책
- **화**: 퇴근 후 30분 읽기 좋은 책
- **수**: 불면증에 도움되는 책
- **목**: 주말을 계획하게 만드는 책
- **금**: 주말에 몰입할 책
- **토**: 마음이 무거울 때 읽는 책
- **일**: 다음 주를 시작하기 위한 책

---

## 3. 전체 시스템 아키텍처

```
[1] 책 데이터 수집
    ├─ 신간: 교보문고/알라딘/예스24 API
    ├─ 고전·베스트셀러: DB에 풀 구축
    └─ 책 정보: Google Books, Open Library API
       ↓
[2] 오늘의 책 선정
    ├─ 요일 테마 + 최근 올린 책 제외
    ├─ LLM이 10권 후보 중 1권 선택
    └─ 이유 설명 생성
       ↓
[3] AI 콘텐츠 생성
    ├─ 책 핵심 메시지 (한 줄)
    ├─ 이런 사람에게 추천
    ├─ 인상적인 구절 3개
    ├─ 5줄 요약
    └─ 해시태그
       ↓
[4] 카드 이미지 생성
    ├─ 1장: 표지 + 제목 + 훅
    ├─ 2장: 이런 사람에게 추천
    ├─ 3~5장: 핵심 포인트 3가지
    ├─ 6장: 인상 깊은 문장
    └─ 7장: 책 정보 + CTA
       ↓
[5] 인스타 캐러셀 업로드
       ↓
[6] 성과 추적 → 다음 추천에 반영
```

### 전체 기술 스택

```
[프레임워크]
Next.js 15 + App Router

[AI]
Vercel AI SDK (generateObject로 구조화 출력)
Claude Opus 4.5 (고품질) 또는 GPT-5 (속도)
GPT-5 Vision (이미지가 들어간 기사 분석)

[데이터 수집]
rss-parser (RSS)
Playwright (동적 페이지)
node-cron / Vercel Cron (스케줄링)

[이미지 생성]
Next.js ImageResponse (@vercel/og)
또는 Bannerbear/Placid API

[이미지 호스팅]
Cloudinary (무료 티어 충분) 또는 Vercel Blob

[DB]
Supabase (PostgreSQL + 편한 API)
또는 Vercel Postgres

[인스타 업로드]
Instagram Graph API

[배포]
Vercel (Cron 기능 무료 포함)
```

---

## 4. 1단계: 책 데이터 수집

### 한국 도서 API

```typescript
// 알라딘 API (무료, 가장 추천)
const ALADIN_KEY = process.env.ALADIN_KEY

// 신간 리스트
const newBooks = await fetch(
  `https://www.aladin.co.kr/ttb/api/ItemList.aspx?` +
  `ttbkey=${ALADIN_KEY}&QueryType=ItemNewAll&MaxResults=50&Output=JS&Version=20131101`
).then(r => r.json())

// 베스트셀러
const bestSellers = await fetch(
  `https://www.aladin.co.kr/ttb/api/ItemList.aspx?` +
  `ttbkey=${ALADIN_KEY}&QueryType=Bestseller&MaxResults=50&Output=JS&Version=20131101`
).then(r => r.json())

// 개별 책 상세 (목차, 소개문 등)
const detail = await fetch(
  `https://www.aladin.co.kr/ttb/api/ItemLookUp.aspx?` +
  `ttbkey=${ALADIN_KEY}&itemIdType=ISBN13&ItemId=${isbn}&output=JS&OptResult=authors,fulldescription,Toc`
).then(r => r.json())
```

### 알라딘 API가 가장 좋은 이유
- 무료 (일 5,000건)
- 이미지·소개문·목차·저자 정보 풍부
- 한국 책 정보 가장 정확
- 상업적 사용 가능 (제휴 링크 조건)

### 대안
- **네이버 도서 검색 API**: 간단한 검색용
- **국립중앙도서관 API**: 서지 정보 정확
- **Google Books API**: 해외 도서
- **Open Library**: 무료, 글로벌

### 책 DB 스키마 (Supabase/Postgres)

```sql
create table books (
  id uuid primary key,
  isbn text unique,
  title text,
  author text,
  publisher text,
  published_date date,
  cover_url text,
  description text,
  toc text,              -- 목차
  categories text[],     -- 카테고리
  keywords text[],       -- LLM이 추출한 주제어
  mood text[],           -- LLM이 분류한 분위기 (위로/긴장/흥미 등)
  difficulty text,       -- 쉬움/보통/어려움
  reading_time int,      -- 예상 독서 시간(분)
  embedding vector(1536), -- 유사도 검색용 임베딩
  used_at timestamp,     -- 이미 소개한 날짜 (중복 방지)
  created_at timestamp
);
```

> **중요**: 책을 DB에 저장할 때 **임베딩도 함께 저장**하세요. 나중에 "이 상황에 어울리는 책 찾아줘" 같은 의미 검색이 가능해져요.

---

## 5. 2단계: 오늘의 책 선정 로직

단순 랜덤이 아니라 **AI로 똑똑하게 선택**합니다.

```typescript
import { generateObject } from 'ai'
import { z } from 'zod'

async function selectTodaysBook() {
  const today = new Date()
  const dayOfWeek = today.getDay() // 0=일요일
  
  // 요일별 테마
  const themes = {
    1: '월요병을 날려줄 에너지 있는 책',
    2: '퇴근 후 30분 읽기 좋은 가벼운 책',
    3: '중간 정도 몰입하며 읽을 책',
    4: '주말을 기대하게 만드는 책',
    5: '주말에 몰입할 수 있는 두꺼운 책',
    6: '마음을 다독여주는 책',
    0: '다음 주를 준비하는 책',
  }
  
  const theme = themes[dayOfWeek]
  
  // 최근 30일 내 올린 책 제외
  const recentlyUsed = await db.books.findMany({
    where: { used_at: { gte: subDays(today, 30) } },
    select: { id: true }
  })
  
  // 임베딩으로 테마에 맞는 후보 20권 검색
  const themeEmbedding = await embed(theme)
  const candidates = await db.books.findSimilar({
    embedding: themeEmbedding,
    excludeIds: recentlyUsed.map(b => b.id),
    limit: 20,
  })
  
  // LLM이 최종 1권 선택
  const { object } = await generateObject({
    model: 'anthropic/claude-opus-4.5',
    schema: z.object({
      selectedBookId: z.string(),
      reason: z.string().describe('왜 이 책을 오늘 추천하는지'),
      hook: z.string().describe('독자의 관심을 끌 한 문장'),
    }),
    prompt: `
오늘의 테마: "${theme}"

후보 도서:
${candidates.map((b, i) => `${i+1}. [${b.id}] ${b.title} - ${b.author}
   소개: ${b.description.slice(0, 200)}
   키워드: ${b.keywords.join(', ')}
`).join('\n')}

이 중 오늘의 테마에 가장 잘 맞는 한 권을 골라줘.
단순히 인기 있어서가 아니라, 오늘 이 책을 소개하기에 적절한 맥락이 있어야 해.
    `
  })
  
  return { 
    book: candidates.find(b => b.id === object.selectedBookId), 
    reason: object.reason, 
    hook: object.hook 
  }
}
```

이렇게 하면 **"오늘이 왜 이 책인지"**에 맥락이 생겨서 팔로워가 꾸준히 오게 돼요.

---

## 6. 3단계: 카드 콘텐츠 생성

```typescript
const { object: content } = await generateObject({
  model: 'anthropic/claude-opus-4.5',
  schema: z.object({
    // 1장: 후킹
    cover: z.object({
      hook: z.string().max(30).describe('강렬한 한 문장'),
      theme: z.string().describe('오늘의 테마'),
    }),
    
    // 2장: 이런 사람에게
    targetReader: z.object({
      title: z.string().default('이런 분께 추천해요'),
      items: z.array(z.string()).length(3).describe('구체적 상황 3가지'),
    }),
    
    // 3~5장: 핵심 포인트 3가지
    keyMessages: z.array(z.object({
      title: z.string().max(20),
      description: z.string().max(80),
    })).length(3),
    
    // 6장: 인상 깊은 문장
    quote: z.object({
      text: z.string().describe('책의 실제 문장 또는 핵심 메시지'),
      context: z.string().max(40).describe('어떤 맥락에서 나온 말인지'),
    }),
    
    // 7장: 마무리
    closing: z.object({
      oneLiner: z.string().describe('한 줄 총평'),
      readingTime: z.string().describe('예상 독서 시간'),
    }),
    
    // 캡션 + 해시태그
    caption: z.string().describe('200자 이내, 감성적이고 구체적'),
    hashtags: z.array(z.string()).min(15).max(20),
  }),
  prompt: `
다음 책을 인스타그램 추천 도서 카드로 변환해줘.

책 정보:
- 제목: ${book.title}
- 저자: ${book.author}
- 소개: ${book.description}
- 목차: ${book.toc}

오늘의 선정 이유: ${reason}
훅: ${hook}

톤: 부드럽지만 정확하게. 과장된 표현 피하고 구체적으로.
주의: 책에 실제로 있지 않은 내용을 지어내지 말 것.
  `
})
```

### 인용문 주의사항

책 원문을 **그대로 인용하는 건 저작권 이슈**가 있어요. 짧은 구절은 괜찮지만, 몇 줄 이상은 출판사 허락 필요. 안전한 방법:

1. **책 소개문에 공식적으로 인용된 문장**만 사용
2. **핵심 메시지를 직접 인용 대신 "이 책의 주장" 형태로** 표현
3. **목차 제목** 활용 (저작권 영향 적음)
4. **리뷰·서평 인용** (출처 명시)

---

## 7. 4단계: 카드 디자인

추천 도서 계정의 **핵심은 비주얼**이에요. 책 표지를 활용하면서 일관된 브랜드 유지.

### 카드 구성 예시

**1장: 커버**
```
[상단] 오늘의 추천 도서
[중앙] 책 표지 이미지 (크게)
[하단] 훅 문장
       "퇴근길, 마음을 내려놓고 싶을 때"
[태그] #월요일의책
```

**2장: 이런 분께**
```
이런 분께 추천해요
✓ 요즘 번아웃이 찾아온 직장인
✓ 자기 전 10분 독서 습관을 만들고 싶은 분
✓ 무겁지 않게 위로받고 싶은 날
```

**3~5장: 핵심 포인트 3가지**
```
01 / 작은 일상의 발견
   저자는 매일 지나치는 풍경 속에서...
```

**6장: 문장**
```
"어떤 날은 그냥 
 살아내는 것만으로도 
 충분합니다"
 
 — 책 속에서
```

**7장: 마무리 + CTA**
```
[책 표지 작게] 
[제목 · 저자 · 출판사]
[페이지 수 · 예상 독서 시간: 3시간]

💾 저장하고 주말에 읽어보세요
🔔 매일 다른 책을 추천해드려요
```

### Next.js ImageResponse 구현

```typescript
// /app/api/card/[slide]/route.tsx
import { ImageResponse } from 'next/og'

export async function GET(
  req: Request,
  { params }: { params: { slide: string } }
) {
  const { searchParams } = new URL(req.url)
  const data = JSON.parse(searchParams.get('data')!)
  const slide = parseInt(params.slide)
  
  // 공통 폰트 로드
  const pretendard = await fetch(
    new URL('../../../fonts/Pretendard-Bold.ttf', import.meta.url)
  ).then(r => r.arrayBuffer())
  
  // 슬라이드별 레이아웃
  const layouts = {
    1: <CoverSlide data={data} />,
    2: <TargetReaderSlide data={data} />,
    3: <KeyMessageSlide data={data} index={0} />,
    4: <KeyMessageSlide data={data} index={1} />,
    5: <KeyMessageSlide data={data} index={2} />,
    6: <QuoteSlide data={data} />,
    7: <ClosingSlide data={data} />,
  }
  
  return new ImageResponse(layouts[slide], {
    width: 1080,
    height: 1080,
    fonts: [{ name: 'Pretendard', data: pretendard, weight: 700 }]
  })
}
```

### 디자인 톤 추천

추천 도서 계정은 **차분하고 따뜻한 톤**이 잘 먹혀요:

**[컬러 팔레트 A - 따뜻함]**
- 배경: `#F5F0E8` (크림색)
- 메인: `#2C2416` (짙은 갈색)
- 포인트: `#C67856` (테라코타)
- 서브: `#8B7B6B` (회갈색)

**[컬러 팔레트 B - 모던]**
- 배경: `#FAFAFA`
- 메인: `#1A1A1A`
- 포인트: `#FF6B35` (주황)
- 서브: `#666666`

**[컬러 팔레트 C - 감성]**
- 배경: 책 표지 색에서 추출한 파스텔
- 메인: 흰색 또는 검정
- 포인트: 책 표지 색상

> **팁: 팔레트 C가 가장 예뻐요**. 책 표지의 대표색을 추출해서 매번 다른 색감으로 만들면 피드에 색의 흐름이 생깁니다. `node-vibrant` 라이브러리로 쉽게 구현 가능.

```typescript
import Vibrant from 'node-vibrant'

const palette = await Vibrant.from(book.cover_url).getPalette()
const mainColor = palette.Vibrant.hex    // 책 표지의 대표색
const lightColor = palette.LightMuted.hex // 밝은 톤
// 이 색상들로 카드 배경·포인트 구성
```

---

## 8. 5단계: 업로드 자동화

```typescript
// /app/api/cron/daily-book/route.ts
export async function GET(req: Request) {
  // 인증 (Vercel Cron은 CRON_SECRET 사용)
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  
  try {
    // 1. 오늘의 책 선정
    const { book, reason, hook } = await selectTodaysBook()
    
    // 2. 카드 콘텐츠 생성
    const content = await generateCardContent(book, reason, hook)
    
    // 3. 7장의 카드 이미지 생성 → Cloudinary 업로드
    const imageUrls = await Promise.all(
      [1,2,3,4,5,6,7].map(async (slide) => {
        const cardUrl = `${process.env.SITE_URL}/api/card/${slide}?data=${encodeURIComponent(JSON.stringify(content))}`
        const image = await fetch(cardUrl).then(r => r.blob())
        return await uploadToCloudinary(image)
      })
    )
    
    // 4. 승인 대기 (DB에 저장, 슬랙 알림)
    const draft = await db.drafts.create({
      bookId: book.id,
      imageUrls,
      caption: content.caption,
      hashtags: content.hashtags,
      status: 'pending_review',
    })
    
    await sendSlackNotification({
      text: `📚 오늘의 책 초안 준비됨: ${book.title}`,
      previewUrl: `${process.env.SITE_URL}/admin/drafts/${draft.id}`,
    })
    
    return Response.json({ success: true, draftId: draft.id })
    
  } catch (error) {
    await sendSlackError(error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
```

### 중요: 자동 업로드 대신 "반자동"으로 시작하세요

초기 3개월은 **AI가 초안 → 사람이 검토 → 승인 시 업로드** 흐름을 추천. 이유:
- AI가 책 내용을 틀리게 요약할 수 있음
- 디자인이 이상하게 나올 수 있음
- 첫 팔로워들에게 퀄리티로 신뢰 쌓아야 함

관리자 페이지(`/admin/drafts`)에서 미리보기 + 승인 버튼 만들면 하루 2~3분이면 검토 끝나요.

```typescript
// 승인 시 실제 업로드
async function publishDraft(draftId: string) {
  const draft = await db.drafts.findUnique({ where: { id: draftId }})
  
  // 인스타 캐러셀 업로드
  await uploadToInstagram({
    imageUrls: draft.imageUrls,
    caption: `${draft.caption}\n\n${draft.hashtags.join(' ')}`
  })
  
  // 책을 "사용됨"으로 표시 (중복 방지)
  await db.books.update({
    where: { id: draft.bookId },
    data: { used_at: new Date() }
  })
}
```

### 인스타 캐러셀 업로드 코드

```typescript
async function uploadCarousel(images: string[], caption: string) {
  // 1. 각 이미지를 개별 컨테이너로 생성
  const mediaIds = await Promise.all(
    images.map(async (imageUrl) => {
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${IG_USER_ID}/media`,
        {
          method: 'POST',
          body: JSON.stringify({
            image_url: imageUrl,
            is_carousel_item: true,  // ← 중요
          }),
          headers: { Authorization: `Bearer ${TOKEN}` }
        }
      )
      const { id } = await res.json()
      return id
    })
  )
  
  // 2. 캐러셀 컨테이너 생성
  const carousel = await fetch(
    `https://graph.facebook.com/v21.0/${IG_USER_ID}/media`,
    {
      method: 'POST',
      body: JSON.stringify({
        media_type: 'CAROUSEL',
        children: mediaIds.join(','),
        caption: caption,
      }),
      headers: { Authorization: `Bearer ${TOKEN}` }
    }
  )
  const { id: carouselId } = await carousel.json()
  
  // 3. 발행
  await fetch(
    `https://graph.facebook.com/v21.0/${IG_USER_ID}/media_publish`,
    {
      method: 'POST',
      body: JSON.stringify({ creation_id: carouselId }),
      headers: { Authorization: `Bearer ${TOKEN}` }
    }
  )
}
```

### Vercel Cron 설정

```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/daily-book",
    "schedule": "0 6 * * *"
  }]
}
```

---

## 9. 6단계: 성과 추적 + 학습 루프

이걸 붙이면 **진짜 AI 시스템**이 됩니다.

```typescript
// 업로드 2일 후 인사이트 수집
async function analyzePerformance(postId: string) {
  const insights = await fetch(
    `https://graph.facebook.com/v21.0/${postId}/insights?metric=reach,saved,shares,likes,comments`,
    { headers: { Authorization: `Bearer ${IG_TOKEN}` }}
  ).then(r => r.json())
  
  // 해당 책의 특징과 성과 연결
  await db.performance.create({
    bookId: draft.bookId,
    category: book.categories[0],
    mood: book.mood,
    dayOfWeek: new Date(draft.publishedAt).getDay(),
    reach: insights.reach,
    saved: insights.saved,      // 저장 수 = 추천 도서 핵심 지표
    shares: insights.shares,
  })
}

// 주간 분석 → 다음 추천에 반영
async function weeklyInsights() {
  const topBooks = await db.performance.findMany({
    orderBy: { saved: 'desc' },
    take: 5,
    where: { createdAt: { gte: subWeeks(new Date(), 1) }}
  })
  
  // LLM이 패턴 분석
  const { object: insight } = await generateObject({
    model: 'anthropic/claude-opus-4.5',
    schema: z.object({
      patterns: z.array(z.string()),
      recommendations: z.array(z.string()),
    }),
    prompt: `
이번 주 가장 성과 좋은 책들: ${JSON.stringify(topBooks)}
어떤 패턴이 있고, 다음 주 추천 시 뭘 반영해야 할까?
    `
  })
  
  // 다음 주 프롬프트에 반영
  await db.systemPrompts.update({
    data: { insights: insight.recommendations }
  })
}
```

> **추천 도서 계정의 핵심 지표는 "저장 수"**입니다. 좋아요보다 저장이 더 중요해요. 팔로워가 "나중에 이 책 사야지" 생각하면 저장하거든요. 알고리즘도 저장을 가장 큰 가중치로 봐요.

---

## 10. 4주 MVP 계획

### 1주차: 기반 구축
- 메타·인스타 비즈니스 계정 셋업
- 알라딘 API 키 발급, 테스트 데이터 수집
- Supabase DB 스키마 구축
- 카드 디자인 1~2개 Figma로 컨셉 잡기
- 브랜드명·핸들 결정 (@morning_book, @bookpage.daily 같은)

### 2주차: 데이터 + AI 파이프라인
- 책 500권 DB 구축 (신간 + 베스트셀러 + 스테디셀러)
- 책별 키워드·무드·난이도 LLM으로 태깅
- 임베딩 생성 + 벡터 검색 구축
- 오늘의 책 선정 로직 구현

### 3주차: 카드 생성
- Next.js ImageResponse로 7장 템플릿 제작
- `node-vibrant`으로 책 표지 기반 색상 적용
- 콘텐츠 생성 + 카드 렌더링 풀 파이프라인 테스트

### 4주차: 자동화 + 운영
- 관리자 승인 페이지 구축
- Slack 알림 연동
- Vercel Cron 설정 (매일 오전 6시 초안 생성 → 9시 업로드)
- 성과 추적 대시보드

---

## 11. 콘텐츠 풀 마르지 않게 하는 팁

추천 도서 계정의 함정: **6개월 지나면 소재 고갈 느낌**. 이걸 방지하려면:

### ① 소스 다변화
- 한국 신간 (알라딘)
- 해외 번역 예정작 (NY Times Best Seller)
- 장르별 클래식 (고전)
- 독립 출판 (북저널리즘, 유유 등)
- 절판된 명저 (중고책)

### ② 포맷 다변화
- 월: 오늘의 책 (메인)
- 화: 이 주제 3권 (큐레이션)
- 수: 비슷한 두 권 비교
- 목: 영화·드라마의 원작 도서
- 금: 주말에 읽기 좋은 두꺼운 책
- 토: 한 문장 (책 속 구절만)
- 일: 다음 주 신간 예고

### ③ 시리즈 운영
- "30대에 꼭 읽을 100권" 시리즈
- "1시간 안에 읽는 책"
- "읽지 말아야 할 책" (역발상, 주의: 조심스럽게)
- 계절별·월별 테마

---

## 12. 수익화 경로

책 계정은 **수익화가 비교적 쉬운** 카테고리예요:

1. **알라딘/교보문고 제휴**: 책 링크에 제휴 코드 → 구매당 수수료 (가장 먼저 시작 가능)
2. **출판사 협찬**: 팔로워 5천~1만부터 문의 들어오기 시작
3. **유료 뉴스레터**: Substack으로 "이주의 심화 추천" 연동
4. **독서모임**: 팔로워 모아서 온라인 북클럽 운영
5. **전자책 출판**: "이 계정이 추천한 100권" 정리본

---

## 13. 저작권 주의사항 (상세)

> ⚠️ **미리 알림**: 아래 내용은 일반적 가이드이며 법률 자문이 아닙니다. 상용 서비스로 확장할 계획이면 출판·지식재산권 전문 변호사 상담을 권장합니다.

### 핵심 원칙 4가지

합법적으로 운영 가능합니다. 단, **네 가지 원칙**만 지키면 됩니다:

1. 책 **본문 원문을 길게 인용하지 않는다**
2. 책 **표지 이미지를 변형·합성하지 않는다**
3. **출처를 명시**한다
4. **AI 생성임을 표기**한다

이 원칙 하에서 운영되는 책 소개 계정이 국내외에 수천 개 있고, 법적 문제없이 잘 돌아가고 있습니다.

---

### 13-1. 책 표지 이미지

**안전한 경우**
- ✅ 출판사·유통사 제공 표지 이미지 (알라딘, 교보 API)
- ✅ 책 소개·홍보 목적 사용
- ✅ 원본 그대로 표시
- ✅ "표지 보여주기" 수준

**근거**: 한국 저작권법에는 **공정이용(제35조의5)** 조항이 있고, 책 홍보·소개 목적의 표지 사용은 관례적으로 허용되어 왔습니다. 알라딘 API 자체가 이미지 제공을 전제로 하고, 이용약관에서 소개 목적 사용을 허락합니다.

**위험한 경우**
- ❌ 표지를 **변형·합성·필터 적용**
- ❌ 표지의 **일부만 잘라서 다른 용도로** 사용
- ❌ 표지 위에 **과도한 텍스트·그래픽 추가**로 원형 훼손
- ❌ **출판사 로고·상표** 제거

**실무 기준**

```
✅ OK: 카드 배경에 표지를 그대로 올리기
✅ OK: 표지 옆에 책 정보 텍스트 배치
⚠️ 애매: 표지를 원형 크롭, 그림자 효과
❌ NG: 표지 인물을 다른 배경에 합성
❌ NG: 표지 색만 따서 AI로 유사 이미지 생성
```

**알라딘 API 이용약관 핵심**
- 상품 정보 표시 시 **알라딘 구매 링크 포함 권장**
- 이미지 크기 임의 조정 불가 (크롭·변형 제한)
- 상업적 이용 가능 (제휴 프로그램 조건)

---

### 13-2. 책 본문 인용

가장 민감한 영역입니다.

**저작권법 제28조 (공표된 저작물의 인용)**
> "공표된 저작물은 보도·비평·교육·연구 등을 위하여는 정당한 범위 안에서 공정한 관행에 합치되게 이를 인용할 수 있다."

**"정당한 범위"의 판례 기준**
- 인용되는 분량이 **원저작물 대비 미미**해야 함
- 인용이 **부종적**이어야 함 (내 콘텐츠가 주, 인용이 종)
- **출처를 명확히** 표시해야 함
- **비평·소개 목적**이어야 함

**안전한 인용**
- ✅ **한두 문장** 정도의 짧은 구절
- ✅ 책 **소개문·목차** (출판사 공식 홍보물)
- ✅ 출판사가 **공식 SNS에 공개한 구절**
- ✅ 언론·서평에 **이미 공개적으로 인용된 문장**

**위험한 인용**
- ⚠️ **한 페이지 이상** 분량
- ⚠️ 책의 **핵심 메시지 전체** 요약 (실질적 대체 우려)
- ⚠️ **시·짧은 에세이 전문** (분량 대비 비율이 100%)
- ❌ **여러 구절을 이어붙여** 상당량 재구성

**분량 기준 (업계 관행)**

| 인용 분량 | 판단 |
|----------|------|
| 한 문장 (10~30자) | ✅ 안전 |
| 2~3문장 (100자 내외) | ✅ 일반적으로 안전 |
| 한 단락 (300자 내외) | ⚠️ 맥락 따라 판단 |
| 여러 단락 (1,000자+) | ❌ 허락 필요 |
| 전체 요약본 | ❌ 위험 |

**특히 조심할 장르**
- **시**: 한 편이 짧아서 인용=전체에 해당 → 극히 조심
- **동시·짧은 에세이**: 마찬가지
- **번역서**: 번역자의 저작권도 별도로 보호됨 (이중 주의)

---

### 13-3. 책 요약 — 가장 애매한 영역

단순 "내용 소개"는 OK지만, 너무 상세한 요약은 **실질적으로 책을 읽지 않아도 되게 만들기** 때문에 저작권 침해가 될 수 있습니다. 이걸 **"실질적 대체"**라고 합니다.

**안전 기준**

| 요약 유형 | 판단 |
|----------|------|
| 한 줄 주제 ("사랑과 상실에 대한 소설") | ✅ 안전 |
| 3~5줄 분위기·맥락 소개 | ✅ 안전 |
| 주요 인물·배경 소개 | ✅ 안전 (스포일러 주의) |
| 챕터별 상세 요약 | ⚠️ 주의 |
| 전체 줄거리·결말 포함 요약 | ❌ 위험 |
| 책의 모든 주요 논지 재구성 | ❌ 위험 |

**안전한 요약 방식**

```
✅ 안전: "저자는 현대인의 고독을 다루며, 도시의 일상 속에서 
        우리가 놓치는 감정들에 주목합니다."
        (→ 주제와 접근법만 소개, 구체적 내용 없음)

⚠️ 애매: "1장에서 저자는 A를 주장하고, 2장에서는 B를 설명하며, 
        결론에서는 C를 제시합니다."
        (→ 책의 구조를 재현)

❌ 위험: "저자의 핵심 주장은 1) ~~ 2) ~~ 3) ~~ 이며, 
        구체적 근거는 ~~이다."
        (→ 책을 안 읽어도 내용 파악 가능)
```

**추천 방식: "읽기 전 관심 유도" 톤**

```
"이 책은 이런 질문을 던집니다:
 우리는 왜 관계에서 자꾸 실수할까?
 저자는 심리학적 관점에서 풀어가는데,
 특히 3장의 사례가 인상적입니다."
 
→ 구체적 내용은 안 밝히고, "읽어보고 싶게" 만드는 방식
→ 콘텐츠로도 더 매력적
```

---

### 13-4. 목차 활용

**목차의 저작권**

단순 목차는 **일반적으로 저작권 보호 대상이 아님**이 학계 다수설입니다. 근데 **창작성 있는 목차**(시적으로 쓰인 에세이 목차 등)는 보호받을 수 있습니다.

**안전한 활용**
- ✅ 목차 **일부 장 제목** 언급 ("특히 '흐려지는 경계' 챕터가 인상적")
- ✅ 목차 **구조 설명** ("이 책은 3부로 구성돼 있습니다")
- ✅ 출판사 공식 소개에 **이미 공개된 목차**

**조심할 점**
- ⚠️ **전체 목차 그대로** 이미지로 게시 (목차가 창작적인 경우)
- ⚠️ **목차만 보고도 내용 파악** 가능한 경우

---

### 13-5. 서평·리뷰 인용

- **본인이 직접 쓴 리뷰**: ✅ 당연히 OK
- **짧은 구절 + 출처 명시** (신문 서평, 저자 추천사 등): ✅ 가능
- **공개된 서평** (출판사 홍보 문구, 뉴스 리뷰): ✅ 가능
- 블로그·개인 리뷰 무단 인용 (개인의 저작권): ⚠️ 주의
- 유료 서평지의 장문 인용: ❌ 금지

---

### 13-6. 실무에서 일어나는 실제 이슈들

#### 이슈 1: AI 할루시네이션 → 허위 사실

**문제**: AI가 책에 없는 내용을 "이 책의 주장은 ~~입니다"라고 지어냄.

**법적 리스크**: 저작권 문제가 아니라 **허위사실 적시 명예훼손**이나 **출판사·저자 업무방해** 가능성. 저자가 민감하게 반응하면 손해배상 청구까지 갈 수 있습니다.

**대응**
- **반드시 출판사 공식 소개문 기반**으로만 콘텐츠 생성
- AI에게 "제공된 정보에 없는 내용은 절대 쓰지 말 것" 프롬프트
- 2중 검증 (생성 후 원본과 대조)
- **사람 검수 필수**

#### 이슈 2: 경쟁 출판사의 신고

**문제**: 특정 책을 비판적으로 다루면 해당 출판사가 신고.

**대응**
- 부정적 평가는 **근거 명시**하고 **인용 기반**으로
- "이 책은 나쁘다" ❌ → "이런 분께는 안 맞을 수 있어요" ✅
- 가급적 **긍정적·중립적** 톤 유지

#### 이슈 3: 저자 본인의 이의 제기

**문제**: 저자가 "내 책이 이렇게 소개되는 거 싫다"고 직접 요청.

**대응**
- 즉시 게시물 삭제·수정
- 저자 요청 시 해당 책 향후 다루지 않음
- 분쟁 방지 차원의 **"요청 시 삭제" 정책** 프로필에 명시

#### 이슈 4: 알라딘·교보 이용약관 위반

**문제**: API로 받은 이미지·데이터를 약관 외 용도로 사용.

**대응**
- 알라딘 OpenAPI 이용약관 정독
- 구매 링크 포함 (제휴 프로그램 가입)
- 이미지 출처 표기 ("이미지 제공: 알라딘")

---

### 13-7. 안전한 콘텐츠 생성 프롬프트

이전 코드에 **저작권 안전장치**를 추가하면 이렇게 됩니다.

```typescript
const SAFE_CONTENT_RULES = `
다음 규칙을 반드시 지켜줘:

1. 제공된 출판사 공식 소개문에 있는 정보만 사용
2. 책에 없는 내용을 추측·생성하지 말 것
3. 책 본문 인용은 최대 30자 이내 한 번만
4. 책 전체 내용을 요약·재구성하지 말 것
5. 주제·분위기·대상 독자만 소개 (구체적 줄거리 X)
6. 부정적 평가나 비판 금지
7. 결말·반전·핵심 스포일러 절대 언급 금지
`

const { object: content } = await generateObject({
  model: 'anthropic/claude-opus-4.5',
  schema: z.object({
    theme: z.string().describe('책이 다루는 주제 (내용 아닌 주제만)'),
    mood: z.string().describe('책의 분위기·톤'),
    targetReader: z.array(z.string()).length(3)
      .describe('어떤 상황의 독자에게 맞는지'),
    appealPoint: z.string()
      .describe('이 책의 매력 포인트 (스포일러 없이)'),
    shortQuote: z.string().max(30).optional()
      .describe('출판사 공식 소개에 포함된 짧은 구절 (있을 때만)'),
    caption: z.string().max(200),
  }),
  prompt: `
${SAFE_CONTENT_RULES}

[출판사 공식 소개]
${book.officialDescription}

[목차]
${book.toc}

위 정보만으로 인스타그램 소개 카드를 만들어줘.
  `
})
```

> **핵심**: 입력 자체를 **출판사 공식 소개문으로만 제한**하면 AI가 할루시네이션하거나 저작권 걸리는 내용을 만들 여지가 줄어듭니다.

---

### 13-8. AI 생성 표기

2024년부터 Meta·유럽·미국에서 **AI 생성 콘텐츠 표기**를 요구하는 추세입니다.

**추천 방식**
- 프로필 소개: "AI가 도와 큐레이션한 책 추천 계정"
- 각 게시물 마지막: "* 소개 문구는 AI 도움을 받아 작성되었습니다"
- Meta의 "AI 생성" 라벨 활성화 (설정 가능)

**왜 표기해야 하나**
- 신뢰 구축 (숨기다 걸리면 역풍)
- 플랫폼 정책 준수
- 향후 규제 대응 (EU AI Act 등)

---

### 13-9. 추가 보호 장치 (운영 차원)

#### ① 저작물 삭제 요청 프로세스
프로필 소개에:
```
📧 게시물 관련 문의: bookpage@email.com
저작권자의 삭제 요청 시 24시간 내 처리합니다.
```
→ **출판사·저자의 신뢰**를 얻을 수 있고, 분쟁 발생 시 **선의 증명**에 도움.

#### ② 제휴 프로그램 가입 (알라딘·교보)
- 책 판매 링크를 캡션에 포함
- 출판·유통사 입장에선 **홍보 도움을 주는 계정**이 됨
- 분쟁 대신 **협력 관계**로 전환 가능
- 부수적으로 수익도 발생

#### ③ 출판사 소통
팔로워 늘어나면 오히려 출판사가 먼저 연락 옴:
- 신간 도서 증정
- 저자 인터뷰 제안
- 공식 제휴 콘텐츠 의뢰

**이게 되면 저작권 걱정 끝.** 출판사가 "우리 책 소개해주세요"라고 하는 관계가 됩니다.

---

### 13-10. 게시물 발행 전 체크리스트

새 게시물 만들 때 이 체크리스트로 점검하세요:

```
[ ] 출판사 공식 소개문 기반으로 작성했는가?
[ ] 책 본문 인용이 30자 이내인가? (있다면)
[ ] 인용이 있다면 "책 속에서" 같은 출처 표시가 있는가?
[ ] 책 표지를 변형·합성하지 않았는가?
[ ] 이미지 출처("알라딘")를 명시했는가?
[ ] 책의 결말·반전을 노출하지 않았는가?
[ ] 책의 전체 내용을 요약하지 않았는가?
[ ] 저자·출판사에 부정적 표현이 없는가?
[ ] AI 생성 여부가 표기되었는가?
[ ] 제휴 링크가 있다면 표시되어 있는가?
```

10개 중 9개 이상 ✅ 면 안전한 수준입니다.

---

### 13-11. 장르별 위험도

| 장르 | 위험도 | 이유 |
|------|-------|------|
| 에세이·자기계발 | 낮음 | 주제 소개가 상대적 안전 |
| 경제·경영 | 낮음 | 개념 소개 위주 |
| 소설 | 중간 | 스포일러 주의 |
| 시집 | **높음** | 짧은 분량, 인용=전체 |
| 학술서 | 중간 | 논지 재구성 주의 |
| 만화·그래픽노블 | **높음** | 이미지 권리 복잡 |
| 번역서 | 중간 | 번역자 권리 추가 |
| 자서전·회고록 | 중간 | 당사자·제3자 프라이버시 |

> **처음 시작한다면 에세이·경제·자기계발부터** 추천. 이슈 발생 확률 가장 낮습니다.

---

### 13-12. 최종 정리

#### 안전하게 운영하는 공식

```
✅ 출판사 공식 소개 기반 콘텐츠
+ ✅ 표지 이미지 원형 유지
+ ✅ 짧은 인용 + 출처 명시
+ ✅ 주제·분위기 소개 (내용 전체 요약 X)
+ ✅ AI 생성 표기
+ ✅ 삭제 요청 프로세스
+ ✅ (선택) 제휴 프로그램 가입
= 법적 안전 + 팔로워 신뢰 + 출판사 호감
```

#### 절대 하지 말 것

```
❌ 책 본문 장문 인용·전체 요약
❌ 표지 변형·합성
❌ AI 할루시네이션 그대로 게시
❌ 부정적·비방성 평가
❌ 스포일러 노출
❌ 저작권 표시 제거
```

> **한 줄 요약**: 도서 추천 계정은 "출판사 공식 소개 기반 + 짧은 인용 + 출처 명시"만 지키면 법적으로 안전합니다. 다만 **AI 할루시네이션은 저작권보다 더 큰 리스크**일 수 있으니, 반드시 출판사 공식 소개문만 입력으로 쓰고, 사람 검수 단계를 넣으세요.

---

## 14. 마지막 조언

책 추천 계정은 **3~6개월이 고비**예요. 초기엔 팔로워 안 늘어서 지치기 쉽거든요. 그래서:

1. **처음부터 퀄리티에 집착**: 10개 올리고 양질이면 다음 10개 리치 올라감
2. **릴스 병행**: 카드만으론 도달 한계, 30초 책 소개 릴스가 바이럴 잠재력 큼
3. **댓글에서 대화**: 팔로워가 "다음엔 이런 책" 요청하면 반영 → 충성도 급상승
4. **자신의 독서와 연결**: 100% AI 티 나면 금방 식어요. 본인이 실제로 읽은 책 2~3일에 한 번 섞기

### 비슷한 기존 계정 분석 추천

시작 전에 이런 계정들 벤치마킹해보세요:
- **@bookiepedia**, **@jarednamaste** (해외)
- 한국은 "책읽는 ㅇㅇ" 계열 다수
- Threads·Substack의 도서 큐레이터들

> **따라하지 말고, 관찰하세요**: 어떤 포맷이 저장 많이 받는지, 어떤 톤이 댓글 유도하는지, 해시태그 전략, 업로드 빈도.

---

## 포트폴리오 가치

이 프로젝트는 기술적으로는 **Vercel AI SDK + RAG + 이미지 생성 + 외부 API 통합 + Cron 자동화**를 한번에 경험할 수 있어서 **포트폴리오로도 이상적**입니다. 실제로 계정이 성장하면 이력서에 "월 N만 리치, 팔로워 증가 추이" 같은 구체적 지표까지 쓸 수 있어요.

### 이 프로젝트 하나로 증명되는 역량
- 스트리밍 AI 처리
- 구조화 출력 (generateObject)
- 임베딩 + 벡터 검색 (RAG)
- 이미지 생성 파이프라인
- 외부 API 통합 (알라딘, Instagram Graph)
- 스케줄링·자동화 (Vercel Cron)
- 관측성 (성과 추적)
- AI 할루시네이션 대응
- Human-in-the-loop 승인 흐름

---

*이 문서는 AI 추천 도서 인스타 자동화 프로젝트의 설계 가이드입니다. 실제 구현 시 세부 코드는 환경에 맞게 조정하세요.*
