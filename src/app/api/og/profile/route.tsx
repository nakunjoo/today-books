import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#2C2416",
          position: "relative",
        }}
      >
        {/* 배경 원 장식 */}
        <div
          style={{
            position: "absolute",
            top: -80,
            right: -80,
            width: 320,
            height: 320,
            borderRadius: "50%",
            background: "#C67856",
            opacity: 0.1,
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -60,
            left: -60,
            width: 240,
            height: 240,
            borderRadius: "50%",
            background: "#D4895A",
            opacity: 0.08,
            display: "flex",
          }}
        />

        {/* 중앙 콘텐츠 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
            position: "relative",
          }}
        >
          {/* 책 아이콘 */}
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: 28,
              background: "#C67856",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                alignItems: "center",
              }}
            >
              {/* 책 모양 — 사각형 3줄 */}
              <div style={{ width: 56, height: 8, background: "#fff", borderRadius: 4, opacity: 0.9, display: "flex" }} />
              <div style={{ width: 56, height: 8, background: "#fff", borderRadius: 4, opacity: 0.7, display: "flex" }} />
              <div style={{ width: 40, height: 8, background: "#fff", borderRadius: 4, opacity: 0.5, display: "flex" }} />
            </div>
          </div>

          {/* 텍스트 */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <span
              style={{
                fontSize: 52,
                fontWeight: 800,
                color: "#fff",
                letterSpacing: -1,
              }}
            >
              today
              <span style={{ color: "#C67856" }}>Books</span>
            </span>
            <div style={{ width: 48, height: 3, background: "#C67856", borderRadius: 2, display: "flex" }} />
            <span style={{ fontSize: 22, color: "rgba(255,255,255,0.4)", letterSpacing: 2 }}>
              매일 한 권
            </span>
          </div>
        </div>
      </div>
    ),
    { width: 500, height: 500 },
  );
}
