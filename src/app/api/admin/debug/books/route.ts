import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchPopularLoans, fetchBookDetail, isNovel } from "@/lib/library/client";

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const isbn = searchParams.get("isbn");

  // isbn 파라미터 있으면 도서 상세 조회만
  if (isbn) {
    const detail = await fetchBookDetail(isbn).catch((e) => ({ error: String(e) }));
    return NextResponse.json({ isbn, detail });
  }

  // 기본: 문학 인기대출 중 소설 목록 + 첫 번째 책 상세 조회
  const loanBooks = await fetchPopularLoans({ kdc: 8, days: 30, pageSize: 200, addCode: 0 })
    .then((books) => books.filter((b) => isNovel(b.class_no)))
    .catch((e) => ({ error: String(e) }));
  const firstIsbn = Array.isArray(loanBooks) ? loanBooks[0]?.isbn13 : undefined;
  const detail = firstIsbn ? await fetchBookDetail(firstIsbn).catch((e) => ({ error: String(e) })) : null;

  return NextResponse.json({ loanBooks, detailSample: { isbn13: firstIsbn, detail } });
}
