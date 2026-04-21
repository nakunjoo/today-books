"use client";

import { useState } from "react";
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
  const [expanded, setExpanded] = useState(false);

  if (done) return null;

  const c = draft.content;

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
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* 책 정보 헤더 */}
      <div className="p-4 flex gap-3 items-start">
        {draft.cover_url && (
          <Image
            src={draft.cover_url}
            alt={draft.title ?? ""}
            width={56}
            height={80}
            className="rounded object-cover shrink-0"
            unoptimized
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[#C67856] font-semibold mb-0.5">{draft.theme ?? "오늘의 책"}</p>
          <h2 className="font-bold text-[#2C2416] text-sm leading-snug line-clamp-2">
            《{draft.title ?? "제목 없음"}》
          </h2>
          <p className="text-xs text-[#8B7B6B] mt-0.5">{draft.author}</p>
          {draft.selection_reason && (
            <p className="mt-2 text-xs text-[#8B7B6B] italic border-l-2 border-[#C67856] pl-2 leading-relaxed">
              {draft.selection_reason}
            </p>
          )}
        </div>
        <span className="text-xs text-[#8B7B6B] shrink-0 whitespace-nowrap">
          {new Date(draft.created_at).toLocaleString("ko-KR", {
            month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit",
          })}
        </span>
      </div>

      {/* 슬라이드 미리보기 */}
      {c && (
        <div className="px-4 pb-2 space-y-3">
          {/* 슬라이드 1: 커버 */}
          <div className="bg-[#2C2416] text-white rounded-xl p-3">
            <p className="text-[10px] text-[#C67856] font-semibold mb-1">슬라이드 1 · 커버</p>
            <p className="text-sm font-bold leading-snug">"{c.cover.hook}"</p>
            <p className="text-xs text-[#C67856] mt-1">{c.cover.theme}</p>
          </div>

          {/* 슬라이드 2: 대상 독자 */}
          <div className="bg-[#F5F0E8] rounded-xl p-3">
            <p className="text-[10px] text-[#8B7B6B] font-semibold mb-1">슬라이드 2 · {c.targetReader.title}</p>
            <ul className="space-y-1">
              {c.targetReader.items.map((item, i) => (
                <li key={i} className="text-xs text-[#2C2416] flex gap-1.5">
                  <span className="text-[#C67856]">•</span>{item}
                </li>
              ))}
            </ul>
          </div>

          {/* 슬라이드 3~5: 핵심 메시지 */}
          {c.keyMessages.map((msg, i) => (
            <div key={i} className="bg-[#F5F0E8] rounded-xl p-3">
              <p className="text-[10px] text-[#8B7B6B] font-semibold mb-1">슬라이드 {i + 3} · 핵심 메시지</p>
              <p className="text-xs font-bold text-[#2C2416]">{msg.title}</p>
              <p className="text-xs text-[#8B7B6B] mt-0.5 leading-relaxed">{msg.description}</p>
            </div>
          ))}

          {/* 슬라이드: 인용구 */}
          <div className="bg-[#FDF6EC] border border-[#E8D8C0] rounded-xl p-3">
            <p className="text-[10px] text-[#8B7B6B] font-semibold mb-1">슬라이드 · 인용구</p>
            <p className="text-sm text-[#2C2416] italic font-medium">"{c.quote.text}"</p>
            <p className="text-xs text-[#8B7B6B] mt-1">{c.quote.context}</p>
          </div>

          {/* 슬라이드: 마무리 */}
          <div className="bg-[#F5F0E8] rounded-xl p-3">
            <p className="text-[10px] text-[#8B7B6B] font-semibold mb-1">슬라이드 · 마무리</p>
            <p className="text-xs text-[#2C2416]">{c.closing.oneLiner}</p>
            <p className="text-xs text-[#8B7B6B] mt-0.5">📖 {c.closing.readingTime}</p>
          </div>

          {/* 캡션 토글 */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full text-xs text-[#8B7B6B] py-1 text-left"
          >
            {expanded ? "▲ 캡션 접기" : "▼ 캡션 보기"}
          </button>
          {expanded && (
            <div className="pb-1">
              <p className="text-sm text-[#2C2416] whitespace-pre-wrap leading-relaxed">{draft.caption}</p>
              <p className="mt-2 text-xs text-blue-500 leading-relaxed">{draft.hashtags?.join(" ")}</p>
            </div>
          )}
        </div>
      )}

      {/* 액션 버튼 */}
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
          {loading === "reject" ? "…" : "✕"}
        </button>
      </div>
    </div>
  );
}
