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

function SlideCard({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <div
      className={`shrink-0 w-[calc(100vw-48px)] max-w-sm aspect-square rounded-sm flex flex-col justify-center items-center p-6 text-center ${
        dark ? "bg-[#2C2416] text-white" : "bg-[#F5F0E8] text-[#2C2416]"
      }`}
    >
      {children}
    </div>
  );
}

export function DraftCard({ draft }: { draft: Draft }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  if (done) return null;

  const c = draft.content;

  const slides = c ? [
    // 커버
    <SlideCard key="cover" dark>
      <p className="text-xs text-[#C67856] font-semibold mb-3 tracking-widest uppercase">{c.cover.theme}</p>
      <p className="text-lg font-bold leading-snug mb-4">"{c.cover.hook}"</p>
      <p className="text-xs text-[#C67856]">《{draft.title}》</p>
    </SlideCard>,

    // 대상 독자
    <SlideCard key="target">
      <p className="text-xs text-[#8B7B6B] font-semibold mb-4 tracking-wide">{c.targetReader.title}</p>
      <ul className="space-y-2 text-left w-full">
        {c.targetReader.items.map((item, i) => (
          <li key={i} className="text-sm flex gap-2">
            <span className="text-[#C67856] font-bold">✓</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </SlideCard>,

    // 핵심 메시지들
    ...c.keyMessages.map((msg, i) => (
      <SlideCard key={`key-${i}`} dark={i % 2 === 0}>
        <p className="text-xs text-[#C67856] font-semibold mb-3">POINT {i + 1}</p>
        <p className="text-base font-bold mb-3 leading-snug">{msg.title}</p>
        <p className={`text-xs leading-relaxed ${i % 2 === 0 ? "text-[#C0A882]" : "text-[#8B7B6B]"}`}>
          {msg.description}
        </p>
      </SlideCard>
    )),

    // 인용구
    <SlideCard key="quote" dark>
      <p className="text-3xl text-[#C67856] mb-3">"</p>
      <p className="text-sm font-medium leading-relaxed italic mb-3">{c.quote.text}</p>
      <p className="text-xs text-[#C67856]">— {c.quote.context}</p>
    </SlideCard>,

    // 마무리
    <SlideCard key="closing">
      <p className="text-xs text-[#8B7B6B] font-semibold mb-4 tracking-wide">오늘의 한 줄</p>
      <p className="text-base font-bold leading-snug mb-4">{c.closing.oneLiner}</p>
      <p className="text-xs text-[#8B7B6B]">📖 {c.closing.readingTime}</p>
      <div className="mt-4 w-12 h-0.5 bg-[#C67856]" />
      <p className="text-xs text-[#8B7B6B] mt-3">《{draft.title}》</p>
    </SlideCard>,
  ] : [];

  function handleScroll() {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const slideWidth = el.clientWidth;
    const index = Math.round(el.scrollLeft / slideWidth);
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
          <p className="text-sm font-semibold text-[#2C2416] leading-none truncate">
            {draft.title ?? "제목 없음"}
          </p>
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
            className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide gap-0"
            style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}
          >
            {slides.map((slide, i) => (
              <div key={i} className="snap-center shrink-0 w-full flex justify-center px-3">
                {slide}
              </div>
            ))}
          </div>

          {/* 슬라이드 카운터 */}
          {slides.length > 1 && (
            <div className="absolute top-2 right-4 bg-black/40 text-white text-xs px-2 py-0.5 rounded-full">
              {slideIndex + 1} / {slides.length}
            </div>
          )}

          {/* 페이지 도트 */}
          <div className="flex justify-center gap-1 mt-2 pb-1">
            {slides.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all ${
                  i === slideIndex ? "w-4 h-1.5 bg-[#C67856]" : "w-1.5 h-1.5 bg-gray-200"
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* 액션 버튼 (인스타 스타일) */}
      <div className="px-3 pt-1 pb-2 flex items-center gap-3">
        <button
          onClick={() => handleAction("approve")}
          disabled={loading !== null}
          className="flex items-center gap-1 text-sm font-semibold text-[#2C2416] disabled:opacity-40 active:scale-95 transition-transform"
        >
          <span className="text-xl">{loading === "approve" ? "⏳" : "✅"}</span>
          <span className="text-xs">승인</span>
        </button>
        <button
          onClick={() => handleAction("regenerate")}
          disabled={loading !== null}
          className="flex items-center gap-1 text-sm font-semibold text-[#8B7B6B] disabled:opacity-40 active:scale-95 transition-transform"
        >
          <span className="text-xl">{loading === "regenerate" ? "⏳" : "🔄"}</span>
          <span className="text-xs">재생성</span>
        </button>
        <button
          onClick={() => handleAction("reject")}
          disabled={loading !== null}
          className="flex items-center gap-1 text-sm font-semibold text-red-400 disabled:opacity-40 active:scale-95 transition-transform ml-auto"
        >
          <span className="text-xl">{loading === "reject" ? "⏳" : "🗑️"}</span>
          <span className="text-xs">삭제</span>
        </button>
      </div>

      {/* 캡션 */}
      <div className="px-3 pb-3">
        <p className="text-xs text-[#C67856] font-semibold mb-1">{draft.theme}</p>
        {draft.selection_reason && (
          <p className="text-xs text-[#8B7B6B] italic mb-2">{draft.selection_reason}</p>
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
    </div>
  );
}
