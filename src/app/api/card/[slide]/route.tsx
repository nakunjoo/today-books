import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

type SlideData = {
  cover?: { hook: string; theme: string };
  title?: string;
  author?: string;
  coverUrl?: string;
};

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ slide: string }> },
) {
  const { slide } = await ctx.params;
  const { searchParams } = req.nextUrl;

  const data: SlideData = searchParams.get("data")
    ? JSON.parse(searchParams.get("data")!)
    : {
        cover: {
          hook: "퇴근길, 마음을 내려놓고 싶을 때",
          theme: "월요일의 책",
        },
        title: "달리기를 말할 때 내가 하고 싶은 이야기",
        author: "무라카미 하루키",
      };

  const slideNum = parseInt(slide, 10);

  return new ImageResponse(<Slide1 data={data} slideNum={slideNum} />, {
    width: 1080,
    height: 1080,
  });
}

function Slide1({ data, slideNum }: { data: SlideData; slideNum: number }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        background: "#F5F0E8",
        padding: 80,
        fontFamily: "system-ui",
        color: "#2C2416",
      }}
    >
      <div
        style={{
          fontSize: 32,
          letterSpacing: 4,
          color: "#8B7B6B",
          textTransform: "uppercase",
        }}
      >
        {data.cover?.theme ?? "오늘의 책"}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 32,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
            lineHeight: 1.3,
            maxWidth: 900,
          }}
        >
          {`「${data.cover?.hook ?? "오늘, 이 책을 만나보세요"}」`}
        </div>

        <div style={{ fontSize: 36, color: "#8B7B6B" }}>
          {`《${data.title ?? "책 제목"}》 · ${data.author ?? "저자"}`}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          width: "100%",
          fontSize: 24,
          color: "#C67856",
        }}
      >
        <span>todayBooks</span>
        <span>{slideNum} / 7</span>
      </div>
    </div>
  );
}
