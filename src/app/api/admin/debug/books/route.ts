import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchPopularLoans } from "@/lib/library/client";
import { fetchNaverBookByIsbn } from "@/lib/naver/client";

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const isbn = searchParams.get("isbn");

  // isbn 파라미터 있으면 네이버 책 검색 결과만 조회
  if (isbn) {
    const naver = await fetchNaverBookByIsbn(isbn).catch((e) => ({ error: String(e) }));
    return NextResponse.json({ isbn, naver });
  }

  // 기본: 한국소설 인기대출 목록 + 첫 번째 책 네이버 조회
  const loanBooks = await fetchPopularLoans({ dtlKdc: [813], days: 30, pageSize: 20, addCode: 0 })
    .catch((e) => ({ error: String(e) }));
  const firstIsbn = Array.isArray(loanBooks) ? loanBooks[0]?.isbn13 : undefined;
  const naver = firstIsbn ? await fetchNaverBookByIsbn(firstIsbn).catch((e) => ({ error: String(e) })) : null;

  return NextResponse.json({ loanBooks, naverSample: { isbn13: firstIsbn, naver } });
}
