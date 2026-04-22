import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchAladinList } from "@/lib/aladin/client";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [newBooks, bestBooks] = await Promise.all([
    fetchAladinList({ queryType: "ItemNewAll", max: 50 }),
    fetchAladinList({ queryType: "Bestseller", max: 50 }),
  ]);

  return NextResponse.json({ newBooks, bestBooks });
}
