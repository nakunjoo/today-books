import { createGroq } from "@ai-sdk/groq";
import { generateObject } from "ai";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/server";
import { fetchAladinList, fetchAladinDetail, upgradeImageUrl } from "@/lib/aladin/client";
import { themeForDate } from "@/lib/ai/generate-card";

const groq = createGroq();

// 소설 전용 카테고리 ID 목록
const NOVEL_CATEGORY_IDS = [50998, 50920, 50919, 50993, 89481, 50994, 50922, 89482, 51538, 51032];

const EXCLUDE_CATEGORIES = [
  // 장르 소설 (시리즈물)
  "판타지", "무협소설", "호러", "공포",
  // 시/희곡 (혹시 섞여 들어오는 경우 대비)
  "시>", "희곡", "문학 잡지", "우리나라 옛글",
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

  // 승인된 책은 영구 제외, 대기 중인 초안은 100일 이내만 제외
  const since = new Date();
  since.setDate(since.getDate() - 100);

  const [{ data: approvedDrafts }, { data: recentDrafts }] = await Promise.all([
    db.from("drafts").select("isbn13").eq("status", "approved").not("isbn13", "is", null),
    db.from("drafts").select("isbn13").neq("status", "approved").gte("created_at", since.toISOString()).not("isbn13", "is", null),
  ]);

  const usedIsbns = new Set([
    ...(approvedDrafts ?? []).map((d) => d.isbn13),
    ...(recentDrafts ?? []).map((d) => d.isbn13),
  ].filter(Boolean));

  // 소설 카테고리 ID별 베스트셀러 병렬 fetch
  const bestResults = await Promise.all(
    NOVEL_CATEGORY_IDS.map((id) => fetchAladinList({ queryType: "Bestseller", max: 10, categoryId: id }))
  );
  const newBooks: typeof bestResults[0] = [];
  const bestBooks = bestResults.flat();

  console.log("=== 알라딘 베스트셀러 원본 ===");
  console.log(JSON.stringify(bestBooks, null, 2));

  const seen = new Set<string>();
  const candidates = bestBooks.filter((b) => {
    if (!b.isbn13 || seen.has(b.isbn13)) return false;
    if (usedIsbns.has(b.isbn13)) return false;
    if (EXCLUDE_CATEGORIES.some((kw) => b.categoryName?.includes(kw))) return false;
    if (EXCLUDE_TITLE_KEYWORDS.some((kw) => b.title?.includes(kw))) return false;
    if (EXCLUDE_TITLE_PATTERNS.some((pattern) => pattern.test(b.title ?? ""))) return false;
    seen.add(b.isbn13);
    return true;
  });

  console.log(`[책 선정] 베스트셀러 ${bestBooks.length}권 → 필터 후 후보 ${candidates.length}권`);

  if (candidates.length === 0) throw new Error("선택 가능한 책이 없습니다.");

  // 셔플 후 20권만 LLM에 전달
  const pool = candidates.sort(() => Math.random() - 0.5).slice(0, 20);

  console.log(`[책 선정] LLM에 전달할 ${pool.length}권:`);
  pool.forEach((b, i) => {
    console.log(`  [${i + 1}] ${b.title} | ${b.author} | ${b.categoryName}`);
    console.log(`       소개: ${(b.description ?? "없음").slice(0, 100)}`);
  });

  const { object } = await generateObject({
    model: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
    schema: z.object({
      selectedIsbn: z.string().describe("선택한 책의 isbn13"),
      reason: z.string().describe("왜 오늘 이 책인지 (1~2문장)"),
      hook: z.string().describe("팔로워 관심을 끌 한 문장"),
    }),
    prompt: `
후보 도서 목록:
${pool.map((b) => `- isbn13: ${b.isbn13}\n  제목: ${b.title}\n  저자: ${b.author}\n  카테고리: ${b.categoryName ?? ""}\n  소개: ${(b.description ?? "").slice(0, 300)}`).join("\n\n")}

위 후보 중 오늘 소개할 책 1권을 골라줘.

선정 기준:
- 성인 누구나 읽기 좋은 책 (특정 직업·종교·연령·성별에만 해당하는 책 제외)
- 문학, 에세이, 자기계발, 역사, 과학, 사회 등 일반 독자층이 넓은 분야 우선
- 단순 인기 순위가 아니라, 지금 이 시점에 읽으면 의미 있을 책
- 소개했을 때 공감대가 넓고 이야기거리가 있는 책

한국어로 답변.
    `.trim(),
  });

  const book = pool.find((b) => b.isbn13 === object.selectedIsbn);
  if (!book) throw new Error("LLM이 잘못된 isbn13을 반환했습니다.");

  console.log(`[책 선정] LLM 선택: "${book.title}" | 이유: ${object.reason}`);

  // 목차 포함 상세 정보 fetch
  const detail = await fetchAladinDetail(book.isbn13);

  return {
    book: {
      isbn13: book.isbn13,
      title: book.title,
      author: book.author,
      publisher: book.publisher,
      cover_url: book.cover,
      description: detail?.description ?? book.description,
      toc: detail?.subInfo?.toc ?? null,
    },
    reason: object.reason,
    hook: object.hook,
  };
}
