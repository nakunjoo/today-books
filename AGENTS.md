# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

---

# todayBooks 프로젝트 컨텍스트

## 서비스 개요
도서관 정보나루 인기대출 소설 중 AI가 매일 1권을 선정하고, 관리자가 슬라이드를 검토·승인 후 Instagram에 캐러셀로 게시하는 자동화 서비스.

Instagram 계정: `today_bookpt`
Instagram 소개글: "📖 오늘 뭐 읽지? AI가 매일 추천하는 소설 한 권"

## 기술 스택
- Next.js 16 App Router + TypeScript + Tailwind CSS
- Supabase (PostgreSQL) — drafts 테이블
- Supabase Auth — 관리자 로그인 (tarot-saju와 계정 공유, `src/proxy.ts`에서 세션 확인)
- Vercel AI SDK v6 + @ai-sdk/groq — 텍스트/구조화 출력: `openai/gpt-oss-120b`, 이미지(스크린샷) 인식: `qwen/qwen3.6-27b`
- @vercel/og ImageResponse — 1080×1080 카드 슬라이드 생성 (edge runtime)
- Instagram Graph API v21 — 캐러셀 게시
- react-image-crop — 스크린샷 자유 영역 크롭

## 페이지 구조
- `/` — 공개 링크인바이오 (승인된 책 목록, 알라딘 구매 링크)
- `/manager` — 관리자 페이지 (로그인 필요)
- `/login` — 로그인

## 핵심 파일
```
src/
├── lib/
│   ├── books/
│   │   ├── select.ts      # 정보나루 인기대출 fetch + 필터링 + 상세 조회로 소개글 보강 + LLM 선정 + 실패 초안 정리
│   │   └── draft.ts       # DB 초안 생성
│   ├── ai/
│   │   ├── generate-card.ts  # 슬라이드 콘텐츠 생성
│   │   └── schema.ts         # CardContentSchema (zod)
│   ├── library/
│   │   └── client.ts      # 도서관 정보나루 API 클라이언트 (인기대출 목록, 도서 상세, 제목/저자/소개글 정리)
│   ├── instagram.ts       # 캐러셀 게시 (graph.instagram.com), 실패 시 status=failed 기록
│   ├── instagram-token.ts # 액세스 토큰 DB 캐싱 + 자동 갱신
│   └── telegram.ts        # 텔레그램 알림 전송
├── app/
│   ├── api/
│   │   ├── card/[slide]/route.tsx          # 슬라이드 이미지 렌더링
│   │   ├── cron/
│   │   │   ├── daily-book/route.ts             # 매일 게시 (승인 대기 백로그 우선)
│   │   │   └── refresh-instagram-token/route.ts # 매주 토큰 갱신
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
    ├── DraftCard.tsx       # 초안 카드 (모드 선택, 슬라이드 미리보기)
    ├── CropModal.tsx       # 스크린샷 자유 영역 크롭 모달 (react-image-crop)
    ├── ApprovedList.tsx    # 승인됨/게시완료 목록 (Instagram 게시·삭제 버튼)
    ├── ManagerTabs.tsx     # 대기/승인됨/게시완료 탭 UI
    ├── GenerateButton.tsx  # 초안 생성 버튼
    └── DebugButton.tsx     # 정보나루 API 디버그 (/api/admin/debug/books)
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
DraftCard(`pending_input`) UI는 두 가지 모드 중 하나만 선택:
- **스크린샷 (기본)**: 알라딘 상세페이지 스크린샷(최대 5장) → llama-4-scout vision으로 텍스트 추출. 첨부 이미지 클릭 시 CropModal에서 자유 영역 크롭 가능
- **기본 소개글**: DB에 저장된 정보나루 도서 상세 소개글 사용 (100~200자 내외로 짧음) (설명이 있을 때만)

카드 상단에는 책 제목·알라딘 링크·설명(클릭 시 펼침)이 노출되고, 하단의 단일 "슬라이드 미리보기" 버튼으로 미리보기 생성 → 결과 확인 후 "이 슬라이드로 확정" → save-content로 저장.

## 슬라이드 구성
cover → book → target → key(×2~3) → closing

## 책 데이터 소스 (중요)
- **알라딘 OpenAPI는 2026-10-30에 서비스 종료됨** (모든 호출이 errorCode 999 반환). 알라딘은 링크인바이오/관리자 화면의 구매 링크(웹페이지)로만 사용
- **네이버 책 검색 API도 2026-07-31 종료됨** (신규 앱의 사용 API 목록에 "검색" 없음, 책 검색은 API HUB로도 이관 안 됨). 사용하지 말 것
- **후보 목록**: 도서관 정보나루 `loanItemSrch` (인기대출도서), 최근 30일, `kdc=8`(문학) + `addCode=0`(교양), pageSize 200 → `class_no`가 `8x3`(813 한국, 833 일본, 843 영미 등)인 소설만 남김 (보통 ~170권)
  - ⚠️ 세부주제 `dtl_kdc=813` 등으로 조회하면 0권이 오거나 HTML 에러 페이지가 옴 — 반드시 대주제 `kdc=8`로 받고 코드에서 거를 것
  - 첫 호출은 10초 이상 걸릴 수 있음 (이후 캐시돼서 빠름)
- **소개글/표지**: 정보나루 `srchDtlList` (도서 상세, `isbn13`). 후보를 셔플한 뒤 순차 조회해서 소개글 있는 책 20권까지 LLM에 전달. 소개글 보유율 ~97%, 길이 중앙값 ~155자
  - 표지는 알라딘 이미지 서버 주소(`cover200`)로 와서 `cover500`으로 바꿔 저장
  - 제목은 부제 포함(`안녕이라 그랬어 :김애란 소설`), 저자는 `지은이: 김애란` 형태로 와서 `cleanTitle`/`cleanAuthor`로 정리
- 목차(toc)는 제공 안 해서 null로 저장
- 승인된 책 영구 제외, 미승인 초안 100일 이내 제외

## 필터 규칙 (select.ts)
- EXCLUDE_CATEGORIES: 아동/유아, 종교만 제외 (판타지/무협/호러 등 장르 소설은 후보에 포함, 게시할 책이 부족해서 완화함)
- EXCLUDE_TITLE_KEYWORDS: 종교 관련 키워드
- EXCLUDE_TITLE_PATTERNS: 시리즈 번호, 큰글자책, 세트
- 정보나루 `vol`(권차)이 있는 책 제외
- LLM 선정 기준: 성인 누구나 읽기 좋은 책, 지금 시점에 읽으면 의미 있는 책 — 특정 장르/분야 우선순위는 두지 않음
- `status='failed'`인 초안은 `created_at` 기준 24시간 지나면 selectTodaysBook 호출 시 자동 삭제 (게시 실패한 책이 영구 제외 목록에 계속 걸리는 것 방지)

## 환경변수
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXTAUTH_URL             # 이름은 남아있지만 NextAuth는 안 씀. 사이트 기본 주소 (Instagram 슬라이드 URL, 텔레그램 링크)
GROQ_API_KEY
DATA4LIBRARY_AUTH_KEY    # 도서관 정보나루 인증키 (발급 후 관리자 승인돼야 "API 활성화 상태가 아닙니다" 오류가 사라짐)
INSTAGRAM_USER_ID        # Instagram 비즈니스 계정 ID (앱 ID 아님)
INSTAGRAM_ACCESS_TOKEN   # 장기 토큰 (60일마다 갱신)
CRON_SECRET              # 직접 생성 (openssl rand -base64 32)
TELEGRAM_BOT_TOKEN       # @BotFather로 발급
TELEGRAM_CHAT_ID         # getUpdates API로 확인
```

## 크론 스케줄
- **daily-book**: 매일 오후 6시 (KST) = UTC 09:00, `"0 9 * * *"`
  - **on/off는 DB `cron_settings` 테이블로 제어** (`name='daily-book'`, `enabled`). 배포 없이 값만 바꾸면 다음 실행부터 반영. 행이 없거나 조회 실패 시 꺼진 것으로 처리 ([cron-settings.ts](src/lib/cron-settings.ts))
  - 2026-11-11~11-26 알라딘 API 종료로 꺼뒀다가, 정보나루 전환 후 2026-11-26에 다시 `enabled=true`
  - `status='approved'`인 초안이 이미 있으면(게시 실패로 밀려있던 것 포함) **가장 오래된 것부터 우선 게시**, 없을 때만 새 책 선정
  - 초안 생성/게시 성공·실패 시 텔레그램 알림 전송
- **refresh-instagram-token**: 매주 일요일 오후 6시 (KST) = UTC 09:00, `"0 9 * * 0"`
  - Instagram 장기 토큰을 만료 전에 자동 갱신 (`ig_refresh_token`), 실패 시에만 텔레그램 알림

## 관리자 페이지 탭 구조
- **대기**: `pending_input`, `pending_review` 상태 초안
- **승인됨**: `approved` 상태 — 📤 버튼으로 Instagram 게시
- **게시 완료**: `published` 상태 — 삭제 버튼만 노출 (Instagram 게시물도 함께 삭제)

## 관리자 로그인 (중요)
- **tarot-saju와 같은 Supabase 프로젝트의 계정을 공유** (구글 로그인/NextAuth는 제거함)
- 로그인: 아이디/비밀번호 → `아이디@id.kkorijeom.invalid`로 바꿔 `signInWithPassword` ([username.ts](src/lib/username.ts), tarot-saju와 같은 규칙)
- 관리자 판정: `tarot_admins` 테이블에 있는 계정만 ([auth.ts](src/lib/auth.ts)의 `auth()`). 관리자 추가/삭제는 tarot-saju와 공통이라 양쪽에 같이 적용됨
- `src/proxy.ts`는 로그인 여부만 확인 + 세션 갱신, 관리자 여부는 각 페이지/API의 `auth()`에서 확인
- 두 사이트는 도메인이 달라 로그인 상태는 공유 안 됨 (같은 계정으로 각각 로그인)

## 주의사항
- 모든 UI는 모바일 기준으로 설계 (max-w-lg)
- 슬라이드 이미지는 1080×1080 JPEG, edge runtime에서 생성
- drafts 테이블 Instagram 게시 ID 컬럼명은 `instagram_post_id` (ig_media_id 아님)
- Instagram 게시 시 슬라이드 이미지 URL이 공개 접근 가능해야 함 (로컬 환경 게시 불가, Vercel 배포 필요)
- INSTAGRAM_USER_ID는 앱 ID가 아닌 Instagram 비즈니스 계정 ID (Graph API로 별도 조회)

### Groq 모델 (중요 — Groq가 모델을 자주 deprecate함)
- 이전에 쓰던 `meta-llama/llama-4-scout-17b-16e-instruct`가 Groq에서 완전히 제거되어 2026-07에 전면 교체함. **모델 관련 오류가 나면 먼저 `https://api.groq.com/openai/v1/models`(Bearer GROQ_API_KEY)로 현재 사용 가능한 모델 목록을 직접 확인할 것** — 문서/기억에 의존하지 말 것
- **텍스트/구조화 출력**(`generateObject`, [select.ts](src/lib/books/select.ts), [generate-card.ts](src/lib/ai/generate-card.ts)): `openai/gpt-oss-120b` 사용. Groq에서 `json_schema` structured output을 지원하는 모델은 `openai/gpt-oss-20b`, `openai/gpt-oss-120b`, `openai/gpt-oss-safeguard-20b` 뿐임(그 외 모델은 `generateObject` 호출 시 에러)
- **이미지 인식**(스크린샷 텍스트 추출, extract-description/generate-content/preview-content 3개 라우트): `qwen/qwen3.6-27b` 사용. 이 모델은 추론형이라 응답에 `<think>...</think>` 사고 과정이 섞여 나옴 — 반드시 `providerOptions: { groq: { reasoningFormat: "hidden" } }`를 함께 지정해야 함 (안 하면 책 소개글에 사고 과정 텍스트가 섞여 들어감)

### Instagram 액세스 토큰 (중요 — 헷갈리기 쉬움)
- 이 프로젝트는 **"Instagram API with Instagram Login"** 방식 사용. `graph.instagram.com` 호출, 토큰은 **`IGAA...`로 시작**해야 함
- **Facebook Graph API Explorer**(developers.facebook.com/tools/explorer)로 발급한 `EAA...` 토큰은 이 프로젝트와 포맷이 안 맞아서 사용 불가 ("Invalid OAuth access token - Cannot parse access token" 오류 발생)
- 올바른 발급처: Meta 앱 대시보드 → 앱 선택 → **Instagram → API setup with Instagram login → "Generate access tokens"** 섹션에서 테스터로 연결된 본인 계정 옆 **Generate token** 버튼 (Instagram 앱에서 이미 "앱 및 웹사이트"에 연결돼 있으면 재초대 불필요)
- 토큰은 `.env.local`과 Vercel 환경변수 둘 다 동일하게 갱신 필요 (Vercel은 대시보드에서 직접 교체 후 재배포)
- **DB 캐싱**: 실제 사용 토큰은 `instagram_token` 테이블(id=1 단일 행)에 저장되고, `getInstagramToken()`이 이걸 우선 참조. 테이블이 비어있으면 `INSTAGRAM_ACCESS_TOKEN` env var로 최초 1회 시딩됨. env var를 바꿔도 DB에 이미 캐싱된 값이 있으면 반영 안 되므로, 토큰 교체 후에는 `instagram_token` 테이블의 기존 행을 삭제해서 재시딩되게 해야 함
- 매주 `refresh-instagram-token` 크론이 자동 연장하므로 정상 동작 시에는 수동 재발급 불필요 (60일 만료 전 자동 갱신)
