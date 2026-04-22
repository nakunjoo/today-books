import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

const BG_DARK = "#2C2416";
const BG_WARM = "#F5F0E8";
const ACCENT = "#C67856";
const TEXT_DARK = "#2C2416";
const TEXT_MID = "#8B7B6B";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ slide: string }> },
) {
  const { slide } = await ctx.params;
  const { searchParams } = req.nextUrl;
  const raw = searchParams.get("data");
  const data = raw ? JSON.parse(decodeURIComponent(raw)) : {};

  const SIZE = { width: 1080, height: 1080 };

  switch (slide) {
    case "cover":
      return new ImageResponse(<Cover data={data} />, SIZE);
    case "book":
      return new ImageResponse(<BookCover data={data} />, SIZE);
    case "target":
      return new ImageResponse(<TargetReader data={data} />, SIZE);
    case "key":
      return new ImageResponse(<KeyMessage data={data} />, SIZE);
    case "quote":
      return new ImageResponse(<Quote data={data} />, SIZE);
    case "closing":
      return new ImageResponse(<Closing data={data} />, SIZE);
    default:
      return new ImageResponse(<Cover data={data} />, SIZE);
  }
}

// ── 커버 슬라이드
function Cover({ data }: { data: { hook?: string; theme?: string; title?: string; author?: string } }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: BG_DARK, padding: 80, justifyContent: "space-between" }}>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span style={{ fontSize: 28, color: ACCENT, letterSpacing: 6, textTransform: "uppercase" }}>{data.theme ?? "오늘의 책"}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ width: 60, height: 4, background: ACCENT }} />
        <div style={{ fontSize: 72, fontWeight: 800, color: "#fff", lineHeight: 1.2, maxWidth: 900 }}>
          {`「${data.hook ?? "오늘 이 책을 만나보세요"}」`}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
          <span style={{ fontSize: 36, color: ACCENT }}>《{data.title ?? "책 제목"}》</span>
          <span style={{ fontSize: 28, color: "rgba(255,255,255,0.5)" }}>{data.author ?? ""}</span>
        </div>
      </div>
      <span style={{ fontSize: 24, color: "rgba(255,255,255,0.3)", letterSpacing: 2 }}>todayBooks</span>
    </div>
  );
}

// ── 책 표지 슬라이드
function BookCover({ data }: { data: { title?: string; author?: string; coverUrl?: string; selectionReason?: string } }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#1A1510", gap: 40 }}>
      {data.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={data.coverUrl} alt="" style={{ width: 280, height: 400, objectFit: "contain", borderRadius: 8, boxShadow: "0 24px 80px rgba(0,0,0,0.8)" }} />
      ) : (
        <div style={{ width: 280, height: 400, background: BG_DARK, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 80 }}>📚</span>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 36, fontWeight: 700, color: "#fff", textAlign: "center", maxWidth: 800 }}>《{data.title}》</span>
        <span style={{ fontSize: 26, color: ACCENT }}>{data.author}</span>
        {data.selectionReason && (
          <span style={{ fontSize: 22, color: "rgba(255,255,255,0.5)", textAlign: "center", maxWidth: 700, marginTop: 8 }}>{data.selectionReason}</span>
        )}
      </div>
    </div>
  );
}

// ── 대상 독자 슬라이드
function TargetReader({ data }: { data: { title?: string; items?: string[] } }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: BG_WARM, padding: 100, justifyContent: "center", gap: 60 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ width: 48, height: 4, background: ACCENT }} />
        <span style={{ fontSize: 40, fontWeight: 700, color: TEXT_DARK }}>{data.title ?? "이런 분께 추천해요"}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        {(data.items ?? []).map((item, i) => (
          <div key={i} style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
            <span style={{ fontSize: 36, color: ACCENT, fontWeight: 800, lineHeight: 1.4 }}>✓</span>
            <span style={{ fontSize: 36, color: TEXT_DARK, lineHeight: 1.5 }}>{item}</span>
          </div>
        ))}
      </div>
      <span style={{ fontSize: 22, color: TEXT_MID, letterSpacing: 2 }}>todayBooks</span>
    </div>
  );
}

// ── 핵심 메시지 슬라이드
function KeyMessage({ data }: { data: { point?: number; title?: string; description?: string; dark?: boolean } }) {
  const dark = data.dark ?? false;
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: dark ? BG_DARK : BG_WARM, padding: 100, justifyContent: "center", gap: 40 }}>
      <span style={{ fontSize: 24, color: ACCENT, letterSpacing: 4, fontWeight: 700 }}>POINT {data.point ?? 1}</span>
      <div style={{ width: 48, height: 4, background: ACCENT }} />
      <span style={{ fontSize: 52, fontWeight: 800, color: dark ? "#fff" : TEXT_DARK, lineHeight: 1.3, maxWidth: 880 }}>{data.title}</span>
      <span style={{ fontSize: 32, color: dark ? "rgba(255,255,255,0.6)" : TEXT_MID, lineHeight: 1.6, maxWidth: 880 }}>{data.description}</span>
      <span style={{ fontSize: 22, color: dark ? "rgba(255,255,255,0.2)" : TEXT_MID, letterSpacing: 2, marginTop: 20 }}>todayBooks</span>
    </div>
  );
}

// ── 인용구 슬라이드
function Quote({ data }: { data: { text?: string; context?: string } }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: BG_DARK, padding: 100, justifyContent: "center", alignItems: "center", gap: 40 }}>
      <span style={{ fontSize: 120, color: ACCENT, lineHeight: 0.5, fontFamily: "serif" }}>"</span>
      <span style={{ fontSize: 44, color: "#fff", lineHeight: 1.6, textAlign: "center", maxWidth: 880, fontStyle: "italic" }}>{data.text}</span>
      <div style={{ width: 60, height: 2, background: ACCENT }} />
      <span style={{ fontSize: 28, color: ACCENT }}>{data.context}</span>
      <span style={{ fontSize: 22, color: "rgba(255,255,255,0.2)", letterSpacing: 2, marginTop: 20 }}>todayBooks</span>
    </div>
  );
}

// ── 마무리 슬라이드
function Closing({ data }: { data: { oneLiner?: string; readingTime?: string; title?: string } }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: BG_WARM, padding: 100, justifyContent: "center", alignItems: "center", gap: 40 }}>
      <span style={{ fontSize: 28, color: TEXT_MID, letterSpacing: 4 }}>오늘의 한 줄</span>
      <div style={{ width: 48, height: 4, background: ACCENT }} />
      <span style={{ fontSize: 52, fontWeight: 800, color: TEXT_DARK, lineHeight: 1.4, textAlign: "center", maxWidth: 880 }}>{data.oneLiner}</span>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, marginTop: 20 }}>
        <span style={{ fontSize: 28, color: TEXT_MID }}>📖 {data.readingTime}</span>
        <span style={{ fontSize: 26, color: ACCENT }}>《{data.title}》</span>
      </div>
      <span style={{ fontSize: 22, color: TEXT_MID, letterSpacing: 2, marginTop: 20 }}>todayBooks</span>
    </div>
  );
}
