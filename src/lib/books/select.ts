import { createGroq } from "@ai-sdk/groq";
import { generateObject } from "ai";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  fetchPopularLoans, fetchBookDetail, isNovel,
  cleanTitle, cleanAuthor, cleanDescription, upgradeCoverUrl,
} from "@/lib/library/client";
import { themeForDate } from "@/lib/ai/generate-card";

const groq = createGroq();

// LLM에 넘길 후보 수 (소개글이 있는 책만 채움)
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

  // 문학(KDC 8) 인기대출도서를 받은 뒤 분류번호로 소설(8x3)만 남김
  // addCode=0(교양)으로 아동·청소년·학습서 제외
  const loanBooks = (await fetchPopularLoans({ kdc: 8, days: 30, pageSize: 200, addCode: 0 }))
    .filter((b) => isNovel(b.class_no));
  if (loanBooks.length === 0) throw new Error("정보나루 인기대출 소설을 하나도 가져오지 못했습니다.");

  const seen = new Set<string>();
  const candidates = loanBooks.filter((b) => {
    const title = cleanTitle(b.bookname ?? "");
    if (!b.isbn13 || seen.has(b.isbn13)) return false;
    if (usedIsbns.has(b.isbn13)) return false;
    if (b.vol?.trim()) return false; // 권차 있는 책(시리즈) 제외
    if (EXCLUDE_CATEGORIES.some((kw) => b.class_nm?.includes(kw))) return false;
    if (EXCLUDE_TITLE_KEYWORDS.some((kw) => title.includes(kw))) return false;
    if (EXCLUDE_TITLE_PATTERNS.some((pattern) => pattern.test(title))) return false;
    seen.add(b.isbn13);
    return true;
  });

  console.log(`[책 선정] 인기대출 소설 ${loanBooks.length}권 → 필터 후 후보 ${candidates.length}권`);

  if (candidates.length === 0) throw new Error("선택 가능한 책이 없습니다.");

  // 셔플 후 도서 상세 조회로 소개글/표지 보강, 소개글 있는 책만 POOL_SIZE권까지 채움
  const pool: Array<{
    isbn13: string; title: string; author: string; publisher: string;
    classNm: string; cover: string; description: string;
  }> = [];
  for (const loan of candidates.sort(() => Math.random() - 0.5)) {
    if (pool.length >= POOL_SIZE) break;
    try {
      const detail = await fetchBookDetail(loan.isbn13);
      const description = cleanDescription(detail?.description ?? "");
      if (!description) continue; // 소개글 없는 책 제외
      pool.push({
        isbn13: loan.isbn13,
        title: cleanTitle(loan.bookname),
        author: cleanAuthor(loan.authors),
        publisher: loan.publisher,
        classNm: loan.class_nm,
        cover: upgradeCoverUrl(detail?.bookImageURL || loan.bookImageURL),
        description,
      });
    } catch (err) {
      console.error(`[책 선정] 상세 조회 실패 (${loan.isbn13}):`, err instanceof Error ? err.message : err);
    }
  }

  if (pool.length === 0) throw new Error("소개글을 가진 후보를 찾지 못했습니다.");

  console.log(`[책 선정] LLM에 전달할 ${pool.length}권:`);
  pool.forEach((b, i) => {
    console.log(`  [${i + 1}] ${b.title} | ${b.author} | ${b.classNm}`);
    console.log(`       소개: ${b.description.slice(0, 100)}`);
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
${pool.map((b) => `- isbn13: ${b.isbn13}\n  제목: ${b.title}\n  저자: ${b.author}\n  분류: ${b.classNm ?? ""}\n  소개: ${b.description.slice(0, 300)}`).join("\n\n")}

위 후보 중 오늘 소개할 책 1권을 골라줘.

선정 기준:
- 성인 누구나 읽기 좋은 책 (특정 직업·종교·연령·성별에만 해당하는 책 제외)
- 단순 인기 순위가 아니라, 지금 이 시점에 읽으면 의미 있을 책
- 소개했을 때 공감대가 넓고 이야기거리가 있는 책

한국어로 답변.
    `.trim(),
  });

  const book = pool.find((b) => b.isbn13 === object.selectedIsbn);
  if (!book) throw new Error("LLM이 잘못된 isbn13을 반환했습니다.");

  console.log(`[책 선정] LLM 선택: "${book.title}" | 이유: ${object.reason}`);

  return {
    book: {
      isbn13: book.isbn13,
      title: book.title,
      author: book.author,
      publisher: book.publisher,
      cover_url: book.cover || null,
      description: book.description,
      toc: null, // 정보나루는 목차 미제공
    },
    reason: object.reason,
    hook: object.hook,
  };
}
