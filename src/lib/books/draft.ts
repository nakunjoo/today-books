import { supabaseAdmin } from "@/lib/supabase/server";
import { generateCardContent, themeForDate } from "@/lib/ai/generate-card";
import { selectTodaysBook } from "@/lib/books/select";

export async function createDraft() {
  const db = supabaseAdmin();
  const theme = themeForDate();

  const { book, reason, hook } = await selectTodaysBook(theme);

  const content = await generateCardContent(
    { title: book.title, author: book.author ?? "", description: book.description ?? "", toc: book.toc ?? undefined },
    { theme, selectionReason: reason },
  );

  const { data: draft, error } = await db
    .from("drafts")
    .insert({
      status: "pending_review",
      theme,
      selection_reason: reason,
      hook,
      isbn13: book.isbn13,
      title: book.title,
      author: book.author,
      publisher: book.publisher,
      cover_url: book.cover_url,
      description: book.description,
      toc: book.toc,
      content,
      caption: `${content.caption}\n\n📖 알라딘에서 보기: https://www.aladin.co.kr/shop/wproduct.aspx?ISBN=${book.isbn13}`,
      hashtags: content.hashtags,
      image_urls: [],
    })
    .select()
    .single();

  if (error) throw new Error(`초안 저장 실패: ${error.message}`);

  return { draft, book, content };
}
