import { createGroq } from "@ai-sdk/groq";
import { generateObject } from "ai";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/server";
import { themeForDate } from "@/lib/ai/generate-card";

const groq = createGroq();

const THIRTY_DAYS_AGO = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString();
};

export async function selectTodaysBook(theme?: string) {
  const db = supabaseAdmin();
  const todayTheme = theme ?? themeForDate();

  // 최근 30일 내 사용된 책 제외, 차단 책 제외, 랜덤 20권 후보
  const { data: candidates, error } = await db
    .from("books")
    .select("id, title, author, description, keywords, mood, categories")
    .eq("blocked", false)
    .or(`used_at.is.null,used_at.lt.${THIRTY_DAYS_AGO()}`)
    .limit(20);

  if (error) throw new Error(`DB 오류: ${error.message}`);
  if (!candidates || candidates.length === 0) {
    throw new Error("선택 가능한 책이 없습니다. 먼저 책을 수집해주세요.");
  }

  if (candidates.length === 1) {
    return { book: candidates[0], reason: "유일한 후보", hook: candidates[0].title };
  }

  // LLM이 오늘 테마에 맞는 1권 선택
  const { object } = await generateObject({
    model: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
    schema: z.object({
      selectedBookId: z.string().describe("선택한 책의 id"),
      reason: z.string().describe("왜 오늘 이 책인지 (1~2문장)"),
      hook: z.string().max(40).describe("팔로워 관심을 끌 한 문장"),
    }),
    prompt: `
오늘의 테마: "${todayTheme}"

후보 도서 목록:
${candidates.map((b) => `- id: ${b.id}\n  제목: ${b.title}\n  저자: ${b.author}\n  소개: ${(b.description ?? "").slice(0, 150)}`).join("\n\n")}

위 후보 중 오늘의 테마에 가장 잘 어울리는 책 1권을 골라줘.
인기 때문이 아니라, 오늘 이 책을 소개하기에 좋은 맥락이 있어야 해.
한국어로 답변.
    `.trim(),
  });

  const book = candidates.find((b) => b.id === object.selectedBookId);
  if (!book) throw new Error("LLM이 잘못된 book id를 반환했습니다.");

  return { book, reason: object.reason, hook: object.hook };
}
