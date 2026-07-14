import { NextResponse } from "next/server";
import { refreshInstagramToken } from "@/lib/instagram-token";
import { sendTelegram } from "@/lib/telegram";

// Vercel Cron: 매주 일요일 오후 6시 (KST = UTC 9시) — 60일 만료 전 주기적 갱신
export async function GET(req: Request) {
  if (process.env.NODE_ENV === "production") {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const result = await refreshInstagramToken();

  if (!result.ok) {
    await sendTelegram(`❌ Instagram 토큰 자동 갱신 실패\n\n오류: ${result.error}\n\n수동으로 재발급이 필요합니다.`);
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
