import { fetchAladinList, fetchAladinDetail } from "@/lib/aladin/client";
import { supabaseAdmin } from "@/lib/supabase/server";

type AladinItem = {
  isbn13: string;
  title: string;
  author: string;
  publisher: string;
  pubDate: string;
  cover: string;
  description: string;
  categoryName: string;
  link: string;
  subInfo?: { toc?: string };
};

export async function collectBooks(opts: { max?: number } = {}) {
  const max = opts.max ?? 50;
  const db = supabaseAdmin();

  // 신간 + 베스트셀러 합쳐서 수집
  const [newBooks, bestSellers] = await Promise.all([
    fetchAladinList({ queryType: "ItemNewAll", max }),
    fetchAladinList({ queryType: "Bestseller", max }),
  ]);

  const seen = new Set<string>();
  const items = [...newBooks, ...bestSellers].filter((b) => {
    if (!b.isbn13 || seen.has(b.isbn13)) return false;
    seen.add(b.isbn13);
    return true;
  }) as AladinItem[];

  let inserted = 0;
  let skipped = 0;

  for (const item of items) {
    // 이미 DB에 있는 ISBN은 skip
    const { data: existing } = await db
      .from("books")
      .select("id")
      .eq("isbn13", item.isbn13)
      .single();

    if (existing) {
      skipped++;
      continue;
    }

    // 상세 정보 (목차 포함) 추가 조회
    const detail = await fetchAladinDetail(item.isbn13);
    const toc = detail?.subInfo?.toc ?? null;

    const { error: insertError } = await db.from("books").insert({
      isbn13: item.isbn13,
      title: item.title,
      author: item.author,
      publisher: item.publisher,
      published_date: item.pubDate || null,
      cover_url: item.cover,
      description: detail?.description ?? item.description,
      toc,
      categories: item.categoryName ? [item.categoryName] : [],
    });

    if (insertError) throw new Error(`삽입 실패 (${item.isbn13}): ${insertError.message}`);

    inserted++;
    // 알라딘 API 레이트 리밋 방지
    await new Promise((r) => setTimeout(r, 300));
  }

  return { inserted, skipped, total: items.length };
}
