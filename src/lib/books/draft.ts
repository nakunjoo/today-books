import { supabaseAdmin } from "@/lib/supabase/server";
import { themeForDate } from "@/lib/ai/generate-card";
import { selectTodaysBook } from "@/lib/books/select";

export async function createDraft() {
  const db = supabaseAdmin();
  const theme = themeForDate();

  const { book, reason, hook } = await selectTodaysBook(theme);

  const { data: draft, error } = await db
    .from("drafts")
    .insert({
      status: "pending_input",
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
      image_urls: [],
    })
    .select()
    .single();

  if (error) throw new Error(`초안 저장 실패: ${error.message}`);

  return { draft, book };
}
