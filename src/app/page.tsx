import { supabaseAdmin } from "@/lib/supabase/server";
import Image from "next/image";

export const dynamic = "force-dynamic";

type Book = {
  id: string;
  title: string | null;
  author: string | null;
  cover_url: string | null;
  isbn13: string | null;
  selection_reason: string | null;
  created_at: string;
};

export default async function BooksPage() {
  const db = supabaseAdmin();
  const { data: books } = await db
    .from("drafts")
    .select("id, title, author, cover_url, isbn13, selection_reason, created_at")
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-[#F5F0E8]">
      <header className="bg-[#2C2416] text-white px-4 py-5 text-center">
        <p className="text-xs text-[#C67856] tracking-widest mb-1">오늘의 책</p>
        <h1 className="text-xl font-bold tracking-tight">todayBooks</h1>
        <p className="text-xs text-white/40 mt-1">매일 한 권, 당신의 삶을 바꿀 책</p>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5">
        {!books || books.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-[#8B7B6B] text-sm">아직 소개된 책이 없어요.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {(books as Book[]).map((book) => (
              <a
                key={book.id}
                href={book.isbn13 ? `https://www.aladin.co.kr/shop/wproduct.aspx?ISBN=${book.isbn13}` : "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white rounded-2xl overflow-hidden shadow-sm flex items-center gap-3 px-4 py-3 active:scale-[0.98] transition-transform"
              >
                {book.cover_url ? (
                  <Image
                    src={book.cover_url}
                    alt={book.title ?? ""}
                    width={56}
                    height={80}
                    className="rounded object-cover shrink-0"
                    style={{ width: 56, height: 80 }}
                    unoptimized
                  />
                ) : (
                  <div className="w-14 h-20 rounded bg-[#EDE5D8] shrink-0 flex items-center justify-center text-[#C67856] text-2xl font-bold">
                    B
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#2C2416] text-sm leading-snug truncate">{book.title}</p>
                  <p className="text-xs text-[#8B7B6B] mt-0.5">{book.author}</p>
                  {book.selection_reason && (
                    <p className="text-xs text-[#8B7B6B] mt-1.5 line-clamp-2 leading-relaxed">{book.selection_reason}</p>
                  )}
                </div>
                <svg className="w-4 h-4 text-[#C67856] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
