import { createGroq } from "@ai-sdk/groq";
import { generateObject } from "ai";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/server";
import { fetchAladinList, fetchAladinDetail, upgradeImageUrl } from "@/lib/aladin/client";
import { themeForDate } from "@/lib/ai/generate-card";

const groq = createGroq();

const EXCLUDE_CATEGORIES = [
  // 만화/장르
  "만화", "라이트노벨", "Comics", "Manga",
  // 아동/청소년
  "어린이", "아동", "유아", "초등", "중학", "고등", "청소년",
  // 종교
  "종교", "기독교", "불교", "천주교", "이슬람",
  // 수험/학습
  "수험서", "자격증", "교과서", "외국어", "토익", "토플", "한국어",
  // 전문서/교재
  "대학교재", "전문서적", "악보", "법률", "의학", "간호",
  // 잡지/정기간행물
  "정기간행물", "잡지", "호",
  // 취미 실기
  "드로잉", "뜨개질", "요리", "바느질",
];

export async function selectTodaysBook(theme?: string) {
  const db = supabaseAdmin();
  const todayTheme = theme ?? themeForDate();

  // 승인된 책은 영구 제외, 대기 중인 초안은 90일 이내만 제외
  const since = new Date();
  since.setDate(since.getDate() - 90);

  const [{ data: approvedDrafts }, { data: recentDrafts }] = await Promise.all([
    db.from("drafts").select("isbn13").eq("status", "approved").not("isbn13", "is", null),
    db.from("drafts").select("isbn13").neq("status", "approved").gte("created_at", since.toISOString()).not("isbn13", "is", null),
  ]);

  const usedIsbns = new Set([
    ...(approvedDrafts ?? []).map((d) => d.isbn13),
    ...(recentDrafts ?? []).map((d) => d.isbn13),
  ].filter(Boolean));

  // 알라딘에서 신간 + 베스트셀러 fetch
  const [newBooks, bestBooks] = await Promise.all([
    fetchAladinList({ queryType: "ItemNewAll", max: 50 }),
    fetchAladinList({ queryType: "Bestseller", max: 50 }),
  ]);

  const seen = new Set<string>();
  const candidates = [...newBooks, ...bestBooks].filter((b) => {
    if (!b.isbn13 || seen.has(b.isbn13)) return false;
    if (usedIsbns.has(b.isbn13)) return false;
    if (EXCLUDE_CATEGORIES.some((kw) => b.categoryName?.includes(kw))) return false;
    seen.add(b.isbn13);
    return true;
  });

  if (candidates.length === 0) throw new Error("선택 가능한 책이 없습니다.");

  // 셔플 후 20권만 LLM에 전달
  const pool = candidates.sort(() => Math.random() - 0.5).slice(0, 20);

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
