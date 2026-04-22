# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

---

# todayBooks 프로젝트 컨텍스트

## 서비스 개요
알라딘 베스트셀러 소설 중 AI가 매일 1권을 선정하고, 관리자가 슬라이드를 검토·승인 후 Instagram에 캐러셀로 게시하는 자동화 서비스.

Instagram 계정: `today_bookpt`
Instagram 소개글: "📖 오늘 뭐 읽지? AI가 매일 추천하는 소설 한 권"

## 기술 스택
- Next.js 16 App Router + TypeScript + Tailwind CSS
- Supabase (PostgreSQL) — drafts 테이블
- NextAuth v5 — 인증 (proxy.ts 미들웨어)
- Vercel AI SDK v6 + @ai-sdk/groq (meta-llama/llama-4-scout-17b-16e-instruct)
- @vercel/og ImageResponse — 1080×1080 카드 슬라이드 생성 (edge runtime)
- Instagram Graph API v21 — 캐러셀 게시

## 페이지 구조
- `/` — 공개 링크인바이오 (승인된 책 목록, 알라딘 구매 링크)
- `/manager` — 관리자 페이지 (로그인 필요)
- `/login` — 로그인

## 핵심 파일
```
src/
├── lib/
│   ├── books/
│   │   ├── select.ts      # 알라딘 fetch + 필터링 + LLM 선정
│   │   └── draft.ts       # DB 초안 생성
│   ├── ai/
│   │   ├── generate-card.ts  # 슬라이드 콘텐츠 생성
│   │   └── schema.ts         # CardContentSchema (zod)
│   └── aladin/
│       └── client.ts      # 알라딘 TTB API 클라이언트
├── app/
│   ├── api/
│   │   ├── card/[slide]/route.tsx          # 슬라이드 이미지 렌더링
│   │   └── admin/drafts/[id]/
│   │       ├── preview-content/route.ts    # 슬라이드 미리보기 (DB 저장 없음)
│   │       ├── save-content/route.ts       # 선택한 버전 DB 저장
│   │       ├── extract-description/route.ts # 이미지에서 텍스트 추출만
│   │       ├── generate-content/route.ts   # 슬라이드 생성 (legacy)
│   │       ├── approve/route.ts
│   │       ├── regenerate/route.ts
│   │       ├── reject/route.ts
│   │       ├── delete/route.ts
│   │       └── publish/route.ts            # Instagram 게시
│   └── manager/page.tsx   # 관리자 UI
└── components/
    ├── DraftCard.tsx       # 초안 카드 (버전 비교, 슬라이드 미리보기)
    ├── ApprovedList.tsx    # 승인된 책 목록 (Instagram 게시 버튼)
    ├── GenerateButton.tsx  # 초안 생성 버튼
    └── DebugButton.tsx     # 알라딘 API 디버그
```

## Draft 상태 흐름
```
pending_input → pending_review → approved → published
```
- `pending_input`: 책 선정됨, 슬라이드 생성 대기
- `pending_review`: 슬라이드 생성됨, 관리자 검토 대기
- `approved`: 승인됨, Instagram 게시 대기
- `published`: Instagram 게시 완료

## 슬라이드 생성 워크플로우
1. 버전 A: DB에 저장된 알라딘 API 기본 소개글 사용
2. 버전 B: 알라딘 상세페이지 스크린샷(최대 5장) → llama-4-scout vision으로 텍스트 추출
3. 두 버전 슬라이드를 나란히 비교 후 선택 → save-content로 확정

## 슬라이드 구성
cover → book → target → key(×2~3) → closing

## 알라딘 카테고리 ID (소설 전용)
```
50998, 50920, 50919, 50993, 89481, 50994, 50922, 89482, 51538, 51032
```
- Bestseller만 사용, 카테고리별 max:10 병렬 fetch → 최대 100권
- 승인된 책 영구 제외, 미승인 초안 100일 이내 제외

## 필터 규칙 (select.ts)
- EXCLUDE_CATEGORIES: 판타지/무협/호러/공포/시/희곡/아동/종교
- EXCLUDE_TITLE_KEYWORDS: 종교 관련 키워드
- EXCLUDE_TITLE_PATTERNS: 시리즈 번호, 큰글자책, 세트

## 환경변수
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXTAUTH_URL
NEXTAUTH_SECRET
AUTH_GOOGLE_ID
AUTH_GOOGLE_SECRET
GROQ_API_KEY
ALADIN_TTB_KEY
INSTAGRAM_USER_ID        # 미설정 (계정 등록 후)
INSTAGRAM_ACCESS_TOKEN   # 미설정 (계정 등록 후)
```

## 주의사항
- 모든 UI는 모바일 기준으로 설계 (max-w-lg)
- 슬라이드 이미지는 1080×1080 JPEG, edge runtime에서 생성
- Instagram Graph API: 액세스 토큰 60일마다 갱신 필요
- 알라딘 TTB API: fulldescription 등 OptResult는 일반 키로 subInfo에 안 내려옴
