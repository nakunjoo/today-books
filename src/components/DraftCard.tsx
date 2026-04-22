"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import type { CardContentSchema } from "@/lib/ai/schema";

export type Draft = {
  id: string;
  status: string;
  theme: string | null;
  selection_reason: string | null;
  hook: string | null;
  caption: string | null;
  hashtags: string[];
  content: CardContentSchema | null;
  created_at: string;
  title: string | null;
  author: string | null;
  cover_url: string | null;
  isbn13: string | null;
};

function cardUrl(slide: string, data: Record<string, unknown>) {
  return `/api/card/${slide}?data=${encodeURIComponent(JSON.stringify(data))}`;
}

export function DraftCard({ draft }: { draft: Draft }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [description, setDescription] = useState("");
  const [toc, setToc] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  if (done) return null;

  const c = draft.content;
  const isPendingInput = draft.status === "pending_input";

  const slides = c ? [
    cardUrl("cover", { hook: c.cover.hook, title: draft.title, author: draft.author }),
    cardUrl("book", { title: draft.title, author: draft.author, coverUrl: draft.cover_url, selectionReason: draft.selection_reason }),
    cardUrl("target", { title: c.targetReader.title, items: c.targetReader.items }),
    ...c.keyMessages.map((msg, i) =>
      cardUrl("key", { point: i + 1, title: msg.title, description: msg.description, dark: i % 2 === 0 })
    ),
    cardUrl("closing", { oneLiner: c.closing.oneLiner, readingTime: c.closing.readingTime, title: draft.title }),
  ] : [];

  function handleScroll() {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    setSlideIndex(index);
  }

  async function handleGenerateContent() {
    if (!description.trim()) return alert("소개글을 붙여넣어 주세요");
    setLoading("generate");
    try {
      const res = await fetch(`/api/admin/drafts/${draft.id}/generate-content`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, toc }),
      });
      const data = await res.json();
      if (data.ok) router.refresh();
      else alert(`실패: ${data.error}`);
    } finally {
      setLoading(null);
    }
  }

  async function handleAction(action: "approve" | "reject" | "regenerate") {
    setLoading(action);
    try {
      const res = await fetch(`/api/admin/drafts/${draft.id}/${action}`, { method: "POST" });
      const data = await res.json();
      if (data.ok) setDone(true);
      else alert(`실패: ${data.error}`);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
      {/* 헤더 */}
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/profile.svg" alt="today_bookpt" className="w-9 h-9 rounded-full border-2 border-[#C67856] object-cover shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#2C2416] leading-none">today_bookpt</p>
          <p className="text-xs text-[#8B7B6B] mt-0.5 truncate">{draft.title}</p>
        </div>
        <span className="text-xs text-[#8B7B6B] shrink-0">
          {new Date(draft.created_at).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      {/* 소개글 입력 대기 상태 */}
      {isPendingInput && (
        <div className="px-4 py-4 border-t border-[#F5F0E8]">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-[#2C2416]">알라딘에서 소개글 복붙</p>
            {draft.isbn13 && (
              <a
                href={`https://www.aladin.co.kr/shop/wproduct.aspx?ISBN=${draft.isbn13}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#C67856] font-semibold underline underline-offset-2"
              >
                알라딘 페이지 열기
              </a>
            )}
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="책 소개글을 붙여넣어 주세요..."
            className="w-full text-sm border border-[#EDE5D8] rounded-xl p-3 resize-none focus:outline-none focus:border-[#C67856] text-[#2C2416] placeholder:text-[#C0B4A8]"
            rows={5}
          />
          <textarea
            value={toc}
            onChange={(e) => setToc(e.target.value)}
            placeholder="목차 (선택사항)"
            className="w-full text-sm border border-[#EDE5D8] rounded-xl p-3 resize-none focus:outline-none focus:border-[#C67856] text-[#2C2416] placeholder:text-[#C0B4A8] mt-2"
            rows={3}
          />
          <button
            onClick={handleGenerateContent}
            disabled={loading !== null}
            className="w-full mt-3 bg-[#C67856] text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 active:scale-95 transition-transform"
          >
            {loading === "generate" ? "슬라이드 생성 중…" : "슬라이드 생성"}
          </button>
          <button
            onClick={() => handleAction("reject")}
            disabled={loading !== null}
            className="w-full mt-2 bg-[#F5F0E8] text-red-400 py-2 rounded-xl text-sm disabled:opacity-50"
          >
            {loading === "reject" ? "…" : "삭제"}
          </button>
        </div>
      )}

      {/* 슬라이드 캐러셀 */}
      {slides.length > 0 && (
        <div className="relative">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex overflow-x-auto scrollbar-hide"
            style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}
          >
            {slides.map((url, i) => (
              <div key={i} className="shrink-0 w-full aspect-square" style={{ scrollSnapAlign: "center" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`슬라이드 ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
              </div>
            ))}
          </div>
          {slides.length > 1 && (
            <div className="absolute top-2 right-3 bg-black/40 text-white text-xs px-2 py-0.5 rounded-full">
              {slideIndex + 1} / {slides.length}
            </div>
          )}
          <div className="flex justify-center gap-1 py-2">
            {slides.map((_, i) => (
              <div key={i} className={`rounded-full transition-all ${i === slideIndex ? "w-4 h-1.5 bg-[#C67856]" : "w-1.5 h-1.5 bg-gray-200"}`} />
            ))}
          </div>
        </div>
      )}

      {/* 캡션 */}
      {!isPendingInput && (
        <div className="px-3 pb-3">
          {draft.selection_reason && (
            <p className="text-xs text-[#8B7B6B] italic mb-1.5">{draft.selection_reason}</p>
          )}
          <p className={`text-sm text-[#2C2416] leading-relaxed whitespace-pre-wrap ${!captionExpanded ? "line-clamp-3" : ""}`}>
            {draft.caption}
          </p>
          {draft.caption && draft.caption.length > 100 && (
            <button onClick={() => setCaptionExpanded(!captionExpanded)} className="text-xs text-[#8B7B6B] mt-0.5">
              {captionExpanded ? "접기" : "더 보기"}
            </button>
          )}
          {draft.hashtags?.length > 0 && (
            <p className="text-xs text-blue-500 mt-1.5 leading-relaxed">{draft.hashtags.join(" ")}</p>
          )}
        </div>
      )}

      {/* 액션 버튼 */}
      {!isPendingInput && (
        <div className="border-t border-[#F5F0E8] px-4 py-3 flex gap-2">
          <button
            onClick={() => handleAction("approve")}
            disabled={loading !== null}
            className="flex-1 bg-[#2C2416] text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 active:scale-95 transition-transform"
          >
            {loading === "approve" ? "처리 중…" : "✅ 승인"}
          </button>
          <button
            onClick={() => handleAction("regenerate")}
            disabled={loading !== null}
            className="flex-1 bg-[#F5F0E8] text-[#2C2416] py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 active:scale-95 transition-transform"
          >
            {loading === "regenerate" ? "생성 중…" : "🔄 재생성"}
          </button>
          <button
            onClick={() => handleAction("reject")}
            disabled={loading !== null}
            className="px-4 bg-[#F5F0E8] text-red-400 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 active:scale-95 transition-transform"
          >
            {loading === "reject" ? "…" : "🗑️"}
          </button>
        </div>
      )}
    </div>
  );
}
