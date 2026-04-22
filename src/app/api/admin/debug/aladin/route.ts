import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchAladinList, fetchAladinDetail } from "@/lib/aladin/client";
import { selectTodaysBook } from "@/lib/books/select";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [newBooks, bestBooks] = await Promise.all([
    fetchAladinList({ queryType: "ItemNewAll", max: 50 }),
    fetchAladinList({ queryType: "Bestseller", max: 50 }),
  ]);

  const selected = await selectTodaysBook();
  const detail = await fetchAladinDetail(selected.book.isbn13);

  return NextResponse.json({ newBooks, bestBooks, selected, detail });
}
