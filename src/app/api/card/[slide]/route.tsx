import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

const BG_DARK = "#2C2416";
const BG_WARM = "#F5F0E8";
const BG_MID = "#EDE5D8";
const ACCENT = "#C67856";
const ACCENT2 = "#D4895A";
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
    case "cover":   return new ImageResponse(<Cover data={data} />, SIZE);
    case "book":    return new ImageResponse(<BookCover data={data} />, SIZE);
    case "target":  return new ImageResponse(<TargetReader data={data} />, SIZE);
    case "key":     return new ImageResponse(<KeyMessage data={data} />, SIZE);
    case "quote":   return new ImageResponse(<Quote data={data} />, SIZE);
    case "closing": return new ImageResponse(<Closing data={data} />, SIZE);
    default:        return new ImageResponse(<Cover data={data} />, SIZE);
  }
}

// ── 공통 레이아웃
function Card({ bg, children }: { bg: string; children: React.ReactNode }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: bg, position: "relative", overflow: "hidden" }}>
      {children}
    </div>
  );
}

// ── 커버
function Cover({ data }: { data: { hook?: string; theme?: string; title?: string; author?: string } }) {
  return (
    <Card bg={BG_DARK}>
      {/* 배경 장식 */}
      <div style={{ position: "absolute", top: -200, right: -200, width: 600, height: 600, borderRadius: "50%", background: ACCENT, opacity: 0.08, display: "flex" }} />
      <div style={{ position: "absolute", bottom: -100, left: -100, width: 400, height: 400, borderRadius: "50%", background: ACCENT2, opacity: 0.06, display: "flex" }} />

      <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: 90, justifyContent: "space-between", position: "relative" }}>
        {/* 상단 */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: ACCENT, display: "flex" }} />
          <span style={{ fontSize: 26, color: ACCENT, letterSpacing: 6, textTransform: "uppercase", fontWeight: 600 }}>{data.theme ?? "오늘의 책"}</span>
        </div>

        {/* 중앙 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          <div style={{ width: 72, height: 5, background: ACCENT, borderRadius: 3, display: "flex" }} />
          <div style={{ fontSize: 76, fontWeight: 800, color: "#fff", lineHeight: 1.15, maxWidth: 900, display: "flex", flexWrap: "wrap" }}>
            {`「${data.hook ?? "오늘 이 책을 만나보세요"}」`}
          </div>
        </div>

        {/* 하단 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ fontSize: 32, color: ACCENT, fontWeight: 700 }}>《{data.title ?? "책 제목"}》</span>
            <span style={{ fontSize: 26, color: "rgba(255,255,255,0.4)" }}>{data.author ?? ""}</span>
          </div>
          <span style={{ fontSize: 22, color: "rgba(255,255,255,0.2)", letterSpacing: 3 }}>todayBooks</span>
        </div>
      </div>
    </Card>
  );
}

// ── 책 표지 (이미지 작게만 사용)
function BookCover({ data }: { data: { title?: string; author?: string; coverUrl?: string; selectionReason?: string } }) {
  return (
    <Card bg="#1A1510">
      {/* 배경 원 장식 */}
      <div style={{ position: "absolute", top: "50%", left: "50%", width: 700, height: 700, borderRadius: "50%", background: ACCENT, opacity: 0.04, transform: "translate(-50%,-50%)", display: "flex" }} />

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 48, position: "relative", padding: 80 }}>
        {/* 책 표지 — 작게 표시해서 저화질 티 안 남 */}
        <div style={{ width: 220, height: 310, background: BG_DARK, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 80, position: "relative", overflow: "hidden" }}>
          {data.coverUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={data.coverUrl} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
            : <span style={{ fontSize: 60, color: ACCENT }}>B</span>
          }
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ width: 40, height: 3, background: ACCENT, borderRadius: 2, display: "flex" }} />
          <span style={{ fontSize: 40, fontWeight: 800, color: "#fff", textAlign: "center", maxWidth: 800, display: "flex", flexWrap: "wrap", justifyContent: "center" }}>《{data.title}》</span>
          <span style={{ fontSize: 28, color: ACCENT }}>{data.author}</span>
          {data.selectionReason && (
            <span style={{ fontSize: 24, color: "rgba(255,255,255,0.4)", textAlign: "center", maxWidth: 700, marginTop: 8, display: "flex", flexWrap: "wrap", justifyContent: "center" }}>{data.selectionReason}</span>
          )}
        </div>
      </div>
    </Card>
  );
}

// ── 대상 독자
function TargetReader({ data }: { data: { title?: string; items?: string[] } }) {
  return (
    <Card bg={BG_WARM}>
      <div style={{ position: "absolute", top: 0, right: 0, width: 300, height: 300, background: ACCENT, opacity: 0.06, display: "flex" }} />

      <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: 90, justifyContent: "center", gap: 64, position: "relative" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ width: 56, height: 5, background: ACCENT, borderRadius: 3, display: "flex" }} />
          <span style={{ fontSize: 46, fontWeight: 800, color: TEXT_DARK }}>{data.title ?? "이런 분께 추천해요"}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {(data.items ?? []).map((item: string, i: number) => (
            <div key={i} style={{ display: "flex", gap: 28, alignItems: "flex-start" }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: ACCENT, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                <span style={{ fontSize: 22, color: "#fff", fontWeight: 800 }}>{i + 1}</span>
              </div>
              <span style={{ fontSize: 38, color: TEXT_DARK, lineHeight: 1.5 }}>{item}</span>
            </div>
          ))}
        </div>

        <span style={{ fontSize: 22, color: TEXT_MID, letterSpacing: 3 }}>todayBooks</span>
      </div>
    </Card>
  );
}

// ── 핵심 메시지
function KeyMessage({ data }: { data: { point?: number; title?: string; description?: string; dark?: boolean } }) {
  const dark = data.dark ?? false;
  return (
    <Card bg={dark ? BG_DARK : BG_MID}>
      <div style={{ position: "absolute", bottom: -80, right: -80, width: 400, height: 400, borderRadius: "50%", background: ACCENT, opacity: 0.08, display: "flex" }} />

      <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: 90, justifyContent: "center", gap: 40, position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: ACCENT, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 28, color: "#fff", fontWeight: 800 }}>{data.point ?? 1}</span>
          </div>
          <span style={{ fontSize: 26, color: ACCENT, letterSpacing: 4, fontWeight: 700 }}>POINT</span>
        </div>

        <div style={{ width: 56, height: 4, background: ACCENT, borderRadius: 3, display: "flex" }} />

        <span style={{ fontSize: 58, fontWeight: 800, color: dark ? "#fff" : TEXT_DARK, lineHeight: 1.25, maxWidth: 900, display: "flex", flexWrap: "wrap" }}>{data.title}</span>

        <span style={{ fontSize: 34, color: dark ? "rgba(255,255,255,0.55)" : TEXT_MID, lineHeight: 1.65, maxWidth: 900, display: "flex", flexWrap: "wrap" }}>{data.description}</span>

        <span style={{ fontSize: 22, color: dark ? "rgba(255,255,255,0.15)" : TEXT_MID, letterSpacing: 3, marginTop: 16 }}>todayBooks</span>
      </div>
    </Card>
  );
}

// ── 한 줄 인상 (AI 창작 — 책 본문 인용 아님)
function Quote({ data }: { data: { text?: string; context?: string } }) {
  return (
    <Card bg={BG_DARK}>
      <div style={{ position: "absolute", top: "50%", left: "50%", width: 800, height: 800, borderRadius: "50%", background: ACCENT, opacity: 0.04, transform: "translate(-50%,-50%)", display: "flex" }} />

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: 100, gap: 40, position: "relative" }}>
        {/* 라벨 */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 2, background: ACCENT, borderRadius: 1, display: "flex" }} />
          <span style={{ fontSize: 22, color: ACCENT, letterSpacing: 4, fontWeight: 600 }}>이 책이 건네는 말</span>
          <div style={{ width: 32, height: 2, background: ACCENT, borderRadius: 1, display: "flex" }} />
        </div>

        <span style={{ fontSize: 46, color: "#fff", lineHeight: 1.75, textAlign: "center", maxWidth: 880, display: "flex", flexWrap: "wrap", justifyContent: "center" }}>{data.text}</span>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <div style={{ width: 48, height: 2, background: "rgba(255,255,255,0.15)", borderRadius: 1, display: "flex" }} />
          <span style={{ fontSize: 26, color: "rgba(255,255,255,0.45)", textAlign: "center", maxWidth: 800, display: "flex", flexWrap: "wrap", justifyContent: "center" }}>{data.context}</span>
        </div>

        <span style={{ fontSize: 22, color: "rgba(255,255,255,0.15)", letterSpacing: 3, marginTop: 8 }}>todayBooks</span>
      </div>
    </Card>
  );
}

// ── 마무리
function Closing({ data }: { data: { oneLiner?: string; readingTime?: string; title?: string } }) {
  return (
    <Card bg={BG_WARM}>
      <div style={{ position: "absolute", top: -150, left: -150, width: 500, height: 500, borderRadius: "50%", background: ACCENT, opacity: 0.06, display: "flex" }} />

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: 100, gap: 48, position: "relative" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 26, color: TEXT_MID, letterSpacing: 5 }}>오늘의 한 줄</span>
          <div style={{ width: 56, height: 4, background: ACCENT, borderRadius: 3, display: "flex" }} />
        </div>

        <span style={{ fontSize: 56, fontWeight: 800, color: TEXT_DARK, lineHeight: 1.4, textAlign: "center", maxWidth: 880, display: "flex", flexWrap: "wrap", justifyContent: "center" }}>{data.oneLiner}</span>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 28, color: TEXT_MID }}>{data.readingTime}</span>
          <span style={{ fontSize: 30, color: ACCENT, fontWeight: 700 }}>《{data.title}》</span>
        </div>

        <span style={{ fontSize: 22, color: TEXT_MID, letterSpacing: 3, marginTop: 20 }}>todayBooks</span>
      </div>
    </Card>
  );
}
