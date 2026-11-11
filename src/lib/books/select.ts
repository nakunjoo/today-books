import { createGroq } from "@ai-sdk/groq";
import { generateObject } from "ai";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/server";
import { fetchPopularLoans, type LibraryLoanItem } from "@/lib/library/client";
import { fetchNaverBookByIsbn, type NaverBook } from "@/lib/naver/client";
import { themeForDate } from "@/lib/ai/generate-card";

const groq = createGroq();

// 소설 KDC 세부주제 (한국/중국/일본/영미/독일/프랑스/스페인/이탈리아/기타 소설)
const NOVEL_KDC = [813, 823, 833, 843, 853, 863, 873, 883, 893];

// LLM에 넘길 후보 수 (네이버 소개글이 있는 책만 채움)
const POOL_SIZE = 20;

const EXCLUDE_CATEGORIES = [
  // 아동/청소년
  "어린이", "아동", "유아",
  // 종교
  "종교", "기독교", "불교", "천주교", "이슬람",
];

// 제목에 포함되면 제외할 키워드
const EXCLUDE_TITLE_KEYWORDS = [
  // 종교
  "불교", "기독교", "성경", "천주교", "이슬람", "부처", "예수", "하나님", "성령",
  // 시리즈 숫자 (예: "데스나이트 6", "철경 8")
];

// 제목 패턴으로 제외 (정규식)
const EXCLUDE_TITLE_PATTERNS = [
  /\s\d+\s*[-~]?\s*(권|부|화|화$)?$/, // 끝에 숫자 (시리즈)
  /\[큰글자책\]/,
  /\[세트\]/,
  /세트\s*-\s*전/,
  /\d+~\d+/,                          // 1~3 같은 범위
];

export async function selectTodaysBook(theme?: string) {
  const db = supabaseAdmin();
  const todayTheme = theme ?? themeForDate();

  // 게시 실패한 초안은 24시간 지나면 삭제 (실제로 올라가지 않았는데 제외 필터에만 계속 걸리는 것 방지)
  const failedCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await db.from("drafts").delete().eq("status", "failed").lt("created_at", failedCutoff.toISOString());

  // 승인된 책은 영구 제외, 대기 중인 초안은 100일 이내만 제외
  const since = new Date();
  since.setDate(since.getDate() - 100);

  const [{ data: approvedDrafts }, { data: recentDrafts }] = await Promise.all([
    db.from("drafts").select("isbn13").in("status", ["approved", "published"]).not("isbn13", "is", null),
    db.from("drafts").select("isbn13").not("status", "in", '("approved","published")').gte("created_at", since.toISOString()).not("isbn13", "is", null),
  ]);

  const usedIsbns = new Set([
    ...(approvedDrafts ?? []).map((d) => d.isbn13),
    ...(recentDrafts ?? []).map((d) => d.isbn13),
  ].filter(Boolean));

  // 소설 KDC별 인기대출도서 병렬 fetch (일부 분류가 일시적으로 실패해도 나머지로 진행)
  // addCode=0(교양)으로 아동·청소년·학습서 제외
  const loanResults = await Promise.allSettled(
    NOVEL_KDC.map((kdc) => fetchPopularLoans({ dtlKdc: [kdc], days: 30, pageSize: 20, addCode: 0 }))
  );
  const failedKdc = loanResults.filter((r) => r.status === "rejected");
  if (failedKdc.length > 0) {
    console.error(`[책 선정] KDC ${failedKdc.length}개 조회 실패:`, failedKdc.map((r) => r.reason?.message ?? r.reason));
  }
  const loanBooks = loanResults.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  if (loanBooks.length === 0) throw new Error("정보나루 인기대출도서를 하나도 가져오지 못했습니다.");

  const seen = new Set<string>();
  const candidates = loanBooks.filter((b) => {
    if (!b.isbn13 || seen.has(b.isbn13)) return false;
    if (usedIsbns.has(b.isbn13)) return false;
    if (b.vol?.trim()) return false; // 권차 있는 책(시리즈) 제외
    if (EXCLUDE_CATEGORIES.some((kw) => b.class_nm?.includes(kw))) return false;
    if (EXCLUDE_TITLE_KEYWORDS.some((kw) => b.bookname?.includes(kw))) return false;
    if (EXCLUDE_TITLE_PATTERNS.some((pattern) => pattern.test(b.bookname ?? ""))) return false;
    seen.add(b.isbn13);
    return true;
  });

  console.log(`[책 선정] 인기대출 ${loanBooks.length}권 → 필터 후 후보 ${candidates.length}권`);

  if (candidates.length === 0) throw new Error("선택 가능한 책이 없습니다.");

  // 셔플 후 네이버 책 검색으로 소개글/표지 보강, 소개글 있는 책만 POOL_SIZE권까지 채움
  // (네이버 API 초당 호출 제한이 있어서 순차 호출)
  const pool: Array<{ loan: LibraryLoanItem; naver: NaverBook }> = [];
  for (const loan of candidates.sort(() => Math.random() - 0.5)) {
    if (pool.length >= POOL_SIZE) break;
    try {
      const naver = await fetchNaverBookByIsbn(loan.isbn13);
      if (naver?.description) pool.push({ loan, naver }); // 소개글 없는 책 제외
    } catch (err) {
      console.error(`[책 선정] 네이버 조회 실패 (${loan.isbn13}):`, err instanceof Error ? err.message : err);
    }
  }

  if (pool.length === 0) throw new Error("네이버 책 검색에서 소개글을 가진 후보를 찾지 못했습니다.");

  console.log(`[책 선정] LLM에 전달할 ${pool.length}권:`);
  pool.forEach(({ loan, naver }, i) => {
    console.log(`  [${i + 1}] ${naver.title} | ${naver.author} | ${loan.class_nm}`);
    console.log(`       소개: ${naver.description.slice(0, 100)}`);
  });

  const { object } = await generateObject({
    model: groq("openai/gpt-oss-120b"),
    schema: z.object({
      selectedIsbn: z.string().describe("선택한 책의 isbn13"),
      reason: z.string().describe("왜 오늘 이 책인지 (1~2문장)"),
      hook: z.string().describe("팔로워 관심을 끌 한 문장"),
    }),
    prompt: `
후보 도서 목록:
${pool.map(({ loan, naver }) => `- isbn13: ${loan.isbn13}\n  제목: ${naver.title}\n  저자: ${naver.author}\n  분류: ${loan.class_nm ?? ""}\n  소개: ${naver.description.slice(0, 300)}`).join("\n\n")}

위 후보 중 오늘 소개할 책 1권을 골라줘.

선정 기준:
- 성인 누구나 읽기 좋은 책 (특정 직업·종교·연령·성별에만 해당하는 책 제외)
- 단순 인기 순위가 아니라, 지금 이 시점에 읽으면 의미 있을 책
- 소개했을 때 공감대가 넓고 이야기거리가 있는 책

한국어로 답변.
    `.trim(),
  });

  const picked = pool.find(({ loan }) => loan.isbn13 === object.selectedIsbn);
  if (!picked) throw new Error("LLM이 잘못된 isbn13을 반환했습니다.");
  const { loan, naver } = picked;

  console.log(`[책 선정] LLM 선택: "${naver.title}" | 이유: ${object.reason}`);

  return {
    book: {
      isbn13: loan.isbn13,
      title: naver.title,
      author: naver.author,
      publisher: naver.publisher,
      cover_url: naver.image || loan.bookImageURL || null,
      description: naver.description,
      toc: null, // 네이버/정보나루 모두 목차 미제공
    },
    reason: object.reason,
    hook: object.hook,
  };
}
