import { supabaseAdmin } from "@/lib/supabase/server";
import { generateCardContent, themeForDate } from "@/lib/ai/generate-card";
import { selectTodaysBook } from "@/lib/books/select";

export async function createDraft() {
  const db = supabaseAdmin();
  const theme = themeForDate();

  // 1. 오늘의 책 선정
  const { book, reason, hook } = await selectTodaysBook(theme);

  // 2. 카드 콘텐츠 생성
  const content = await generateCardContent(
    {
      title: book.title,
      author: book.author ?? "",
      description: book.description ?? "",
    },
    { theme, selectionReason: reason },
  );

  // 3. drafts 테이블에 pending_review 상태로 저장
  const { data: draft, error } = await db
    .from("drafts")
    .insert({
      book_id: book.id,
      status: "pending_review",
      theme,
      selection_reason: reason,
      hook,
      content,
      caption: content.caption,
      hashtags: content.hashtags,
      image_urls: [],
    })
    .select()
    .single();

  if (error) throw new Error(`초안 저장 실패: ${error.message}`);

  return { draft, book, content };
}
