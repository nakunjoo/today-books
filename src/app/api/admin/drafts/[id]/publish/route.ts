import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { publishToInstagram } from "@/lib/instagram";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const result = await publishToInstagram(id);

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, igMediaId: result.igMediaId });
}
