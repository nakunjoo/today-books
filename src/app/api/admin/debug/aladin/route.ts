import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchAladinList } from "@/lib/aladin/client";

const ALADIN_BASE = "https://www.aladin.co.kr/ttb/api";

async function fetchDetailRaw(isbn13: string) {
  const key = process.env.ALADIN_TTB_KEY;
  if (!key) throw new Error("ALADIN_TTB_KEY 없음");
  const params = new URLSearchParams({
    ttbkey: key,
    itemIdType: "ISBN13",
    ItemId: isbn13,
    Output: "JS",
    Version: "20131101",
    OptResult: "authors,fulldescription,Toc,Story,cardReview",
  });
  const res = await fetch(`${ALADIN_BASE}/ItemLookUp.aspx?${params}`, { cache: "no-store" });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { parseError: true, raw: text.slice(0, 500) }; }
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const isbn = searchParams.get("isbn");

  // isbn 파라미터 있으면 상세 + getContents 모두 조회
  if (isbn) {
    const [detailRaw, contentsRaw] = await Promise.all([
      fetchDetailRaw(isbn),
      fetch(`https://www.aladin.co.kr/ttb/api/getContents.aspx?ISBN=${isbn}&ttbkey=${process.env.ALADIN_TTB_KEY}&Output=JS`, { cache: "no-store" })
        .then(r => r.text())
        .then(t => { try { return JSON.parse(t); } catch { return { raw: t.slice(0, 1000) }; } })
        .catch(e => ({ error: String(e) })),
    ]);
    return NextResponse.json({ isbn, detailRaw, contentsRaw });
  }

  // 기본: 리스트 + 첫 번째 책 상세 조회
  const NOVEL_CATEGORY_IDS = [50998, 50920, 50919, 50993, 89481, 50994, 50922, 89482, 51538, 51032];
  const bestResults = await Promise.all(
    NOVEL_CATEGORY_IDS.map((id) => fetchAladinList({ queryType: "Bestseller", max: 10, categoryId: id }))
  );
  const bestBooks = bestResults.flat();

  const firstIsbn = bestBooks[0]?.isbn13;

  const [detailRaw, contentsRaw] = firstIsbn
    ? await Promise.all([
        fetchDetailRaw(firstIsbn),
        fetch(`https://www.aladin.co.kr/ttb/api/getContents.aspx?ISBN=${firstIsbn}&ttbkey=${process.env.ALADIN_TTB_KEY}&Output=JS`, { cache: "no-store" })
          .then(r => r.text())
          .then(t => { try { return JSON.parse(t); } catch { return { raw: t.slice(0, 1000) }; } })
          .catch(e => ({ error: String(e) })),
      ])
    : [null, null];

  return NextResponse.json({
    bestBooks,
    detailSample: { isbn13: firstIsbn, detailRaw, contentsRaw },
  });
}
