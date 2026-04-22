"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import type { CardContentSchema } from "@/lib/ai/schema";

export type Draft = {
  id: string;
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
};

export function DraftCard({ draft }: { draft: Draft }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  if (done) return null;

  const c = draft.content;

  const slides = c ? [
    // 커버 — 책 이미지 + 훅
    <div key="cover" className="shrink-0 w-full aspect-square bg-[#2C2416] flex flex-col relative overflow-hidden">
      {draft.cover_url && (
        <Image
          src={draft.cover_url}
          alt={draft.title ?? ""}
          fill
          className="object-cover opacity-30"
          unoptimized
        />
      )}
      <div className="relative z-10 flex flex-col h-full justify-between p-6">
        <p className="text-xs text-[#C67856] font-semibold tracking-widest uppercase">{c.cover.theme}</p>
        <div>
          <p className="text-xl font-bold text-white leading-snug mb-2">"{c.cover.hook}"</p>
          <p className="text-sm text-[#C67856]">《{draft.title}》</p>
          <p className="text-xs text-white/60 mt-1">{draft.author}</p>
        </div>
      </div>
    </div>,

    // 책 표지 슬라이드
    <div key="bookcover" className="shrink-0 w-full aspect-square bg-[#1A1510] flex items-center justify-center relative overflow-hidden">
      {draft.cover_url && (
        <Image
          src={draft.cover_url}
          alt={draft.title ?? ""}
          fill
          className="object-cover opacity-10"
          unoptimized
        />
      )}
      {draft.cover_url ? (
        <div className="relative z-10 flex flex-col items-center gap-4">
          <Image
            src={draft.cover_url}
            alt={draft.title ?? ""}
            width={140}
            height={200}
            className="object-contain rounded shadow-2xl"
            unoptimized
          />
          <p className="text-white text-sm font-semibold text-center px-4">《{draft.title}》</p>
        </div>
      ) : (
        <p className="text-white text-4xl">📚</p>
      )}
    </div>,

    // 대상 독자
    <div key="target" className="shrink-0 w-full aspect-square bg-[#F5F0E8] flex flex-col justify-center p-8">
      <p className="text-xs text-[#C67856] font-semibold mb-5 tracking-wide text-center">{c.targetReader.title}</p>
      <ul className="space-y-3">
        {c.targetReader.items.map((item, i) => (
          <li key={i} className="text-sm text-[#2C2416] flex gap-2.5 items-start">
            <span className="text-[#C67856] font-bold shrink-0">✓</span>
            <span className="leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
    </div>,

    // 핵심 메시지들
    ...c.keyMessages.map((msg, i) => (
      <div key={`key-${i}`} className={`shrink-0 w-full aspect-square flex flex-col justify-center items-center p-8 text-center ${i % 2 === 0 ? "bg-[#2C2416]" : "bg-[#F5F0E8]"}`}>
        <p className="text-xs text-[#C67856] font-semibold mb-4 tracking-widest">POINT {i + 1}</p>
        <p className={`text-base font-bold mb-4 leading-snug ${i % 2 === 0 ? "text-white" : "text-[#2C2416]"}`}>{msg.title}</p>
        <div className="w-8 h-0.5 bg-[#C67856] mb-4" />
        <p className={`text-xs leading-relaxed ${i % 2 === 0 ? "text-white/70" : "text-[#8B7B6B]"}`}>{msg.description}</p>
      </div>
    )),

    // 인용구
    <div key="quote" className="shrink-0 w-full aspect-square bg-[#2C2416] flex flex-col justify-center items-center p-8 text-center relative overflow-hidden">
      {draft.cover_url && (
        <Image src={draft.cover_url} alt="" fill className="object-cover opacity-10" unoptimized />
      )}
      <div className="relative z-10">
        <p className="text-5xl text-[#C67856] mb-4 font-serif">"</p>
        <p className="text-sm font-medium text-white leading-relaxed italic mb-4">{c.quote.text}</p>
        <p className="text-xs text-[#C67856]">— {c.quote.context}</p>
      </div>
    </div>,

    // 마무리
    <div key="closing" className="shrink-0 w-full aspect-square bg-[#F5F0E8] flex flex-col justify-center items-center p-8 text-center">
      <p className="text-xs text-[#8B7B6B] font-semibold mb-4 tracking-wide">오늘의 한 줄</p>
      <p className="text-base font-bold text-[#2C2416] leading-snug mb-6">{c.closing.oneLiner}</p>
      <div className="w-10 h-0.5 bg-[#C67856] mb-6" />
      <p className="text-xs text-[#8B7B6B]">📖 {c.closing.readingTime}</p>
      <p className="text-xs text-[#8B7B6B] mt-2">《{draft.title}》</p>
    </div>,
  ] : [];

  function handleScroll() {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    setSlideIndex(index);
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
      {/* 인스타 헤더 */}
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        {draft.cover_url ? (
          <Image
            src={draft.cover_url}
            alt={draft.title ?? ""}
            width={36}
            height={36}
            className="rounded-full object-cover w-9 h-9 border-2 border-[#C67856]"
            unoptimized
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-[#F5F0E8] border-2 border-[#C67856] flex items-center justify-center text-xs">📚</div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#2C2416] leading-none truncate">{draft.title ?? "제목 없음"}</p>
          <p className="text-xs text-[#8B7B6B] mt-0.5">{draft.author}</p>
        </div>
        <span className="text-xs text-[#8B7B6B] shrink-0">
          {new Date(draft.created_at).toLocaleString("ko-KR", {
            month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit",
          })}
        </span>
      </div>

      {/* 슬라이드 캐러셀 */}
      {slides.length > 0 && (
        <div className="relative">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex overflow-x-auto scrollbar-hide"
            style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}
          >
            {slides.map((slide, i) => (
              <div key={i} className="snap-center shrink-0 w-full" style={{ scrollSnapAlign: "center" }}>
                {slide}
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

      {/* 액션 버튼 — 하단 고정 */}
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
    </div>
  );
}
