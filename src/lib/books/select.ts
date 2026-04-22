import { createGroq } from "@ai-sdk/groq";
import { generateObject } from "ai";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/server";
import { fetchAladinList, fetchAladinDetail, upgradeImageUrl } from "@/lib/aladin/client";
import { themeForDate } from "@/lib/ai/generate-card";

const groq = createGroq();

const EXCLUDE_CATEGORIES = ["만화", "라이트노벨", "Comics", "Manga"];

export async function selectTodaysBook(theme?: string) {
  const db = supabaseAdmin();
  const todayTheme = theme ?? themeForDate();

  // 최근 90일 내 사용된 ISBN 수집 (draft에서)
  const since = new Date();
  since.setDate(since.getDate() - 90);
  const { data: recentDrafts } = await db
    .from("drafts")
    .select("isbn13")
    .gte("created_at", since.toISOString())
    .not("isbn13", "is", null);

  const usedIsbns = new Set((recentDrafts ?? []).map((d) => d.isbn13).filter(Boolean));

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
      hook: z.string().max(40).describe("팔로워 관심을 끌 한 문장"),
    }),
    prompt: `
오늘의 테마: "${todayTheme}"

후보 도서 목록:
${pool.map((b) => `- isbn13: ${b.isbn13}\n  제목: ${b.title}\n  저자: ${b.author}\n  소개: ${(b.description ?? "").slice(0, 150)}`).join("\n\n")}

위 후보 중 오늘의 테마에 가장 잘 어울리는 책 1권을 골라줘.
인기 때문이 아니라, 오늘 이 책을 소개하기에 좋은 맥락이 있어야 해.
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
