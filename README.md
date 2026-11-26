# todayBooks

> 📖 오늘 뭐 읽지?
> AI가 매일 추천하는 소설 한 권 — Instagram 자동화 서비스

---

## 개요

도서관 정보나루 인기대출 소설 중 AI가 한 권을 선정하고, 관리자가 슬라이드를 검토·승인한 뒤 Instagram에 캐러셀로 게시하는 자동화 파이프라인.

## 기술 스택

| 분류 | 기술 |
|---|---|
| 프레임워크 | Next.js 16 (App Router) |
| 언어 | TypeScript |
| 스타일 | Tailwind CSS |
| DB | Supabase (PostgreSQL) |
| 인증 | Supabase Auth (tarot-saju 관리자 계정 공유) |
| AI | Vercel AI SDK v6 + Groq (llama-4-scout-17b) |
| 이미지 생성 | @vercel/og (ImageResponse, 1080×1080) |
| 배포 | Vercel |

---

## 워크플로우

```
1. 초안 생성 (관리자 버튼)
   └─ 정보나루 인기대출도서 문학(KDC 8) 200권 fetch → 소설(8x3)만 남김
   └─ 정보나루 도서 상세 조회로 소개글/표지 보강
   └─ 필터링 (시/희곡/판타지/무협/아동/종교/시리즈 제외)
   └─ LLM이 후보 20권 중 1권 선정
   └─ DB 저장 (status: pending_input)

2. 슬라이드 생성 (관리자 검토)
   └─ 버전 A: 정보나루 도서 상세 소개글로 생성
   └─ 버전 B: 알라딘 상세페이지 스크린샷 첨부 → vision AI 추출
   └─ 두 버전 슬라이드 나란히 비교 후 선택
   └─ DB 저장 (status: pending_review)

3. 승인 (관리자)
   └─ 슬라이드 미리보기 확인
   └─ 승인 / 재생성 / 삭제
   └─ DB 저장 (status: approved)

4. Instagram 게시
   └─ 승인된 게시물 목록에서 📤 버튼
   └─ Instagram Graph API로 캐러셀 게시
   └─ DB 저장 (status: published)
```

---

## 슬라이드 구성

| 슬라이드 | 내용 |
|---|---|
| cover | 훅 문구 + 제목/저자 |
| book | 표지 이미지 + 선정 이유 |
| target | 이런 분께 추천 |
| key × 2~3 | 책의 핵심 포인트 |
| closing | 한 줄 총평 + 예상 독서 시간 |

---

## 페이지 구조

| 경로 | 설명 | 접근 |
|---|---|---|
| `/` | 공개 링크인바이오 (승인된 책 목록 + 알라딘 구매 링크) | 공개 |
| `/manager` | 관리자 페이지 (초안 생성·검토·승인) | 로그인 필요 |
| `/login` | 관리자 로그인 (tarot-saju 아이디/비밀번호) | 공개 |

---

## 책 데이터 소스

알라딘 OpenAPI(2026-10-30)와 네이버 책 검색 API(2026-07-31)가 모두 종료되어 도서관 정보나루만 사용함.

- 후보: 정보나루 인기대출도서 (`loanItemSrch`), 최근 30일, `kdc=8`로 받아서 분류번호 `8x3`(소설)만 남김
- 소개글/표지: 정보나루 도서 상세 조회 (`srchDtlList`)


승인된 책은 영구 제외, 미승인 초안은 100일 이내 제외.

---

## 환경변수

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Auth
# 사이트 기본 주소 (이름만 NEXTAUTH, 관리자 로그인은 tarot-saju 계정 공유)
NEXTAUTH_URL=

# AI
GROQ_API_KEY=

# 도서관 정보나루
DATA4LIBRARY_AUTH_KEY=

# Instagram (계정 등록 후 설정)
INSTAGRAM_USER_ID=
INSTAGRAM_ACCESS_TOKEN=
```

---

## Instagram 계정 등록 절차

1. Instagram 개인 계정 → **전문가 계정** 전환 (설정 → 계정)
2. **Facebook 페이지** 생성 후 Instagram 계정과 연결
3. [developers.facebook.com](https://developers.facebook.com) 에서 **비즈니스 앱** 생성
4. Instagram Graph API 제품 추가
5. `instagram_basic`, `instagram_content_publish` 권한 요청
6. 액세스 토큰 발급 → **장기 액세스 토큰** 변환 (60일 유효)
7. `INSTAGRAM_USER_ID`, `INSTAGRAM_ACCESS_TOKEN` 환경변수에 등록

> ⚠️ 액세스 토큰은 60일마다 갱신 필요

---

## Instagram 계정 소개글

```
📖 오늘 뭐 읽지?

AI가 매일 추천하는 소설 한 권
뭘 읽을지 고민될 때 여기 와서 가져가세요

🔗 오늘의 책 보러 가기 ↓
```
