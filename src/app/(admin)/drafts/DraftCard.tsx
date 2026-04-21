"use client";

import { useState } from "react";
import Image from "next/image";

type Book = { id: string; title: string; author: string | null; cover_url: string | null };
type Draft = {
  id: string;
  theme: string | null;
  selection_reason: string | null;
  hook: string | null;
  caption: string | null;
  hashtags: string[];
  content: Record<string, unknown> | null;
  created_at: string;
  books: Book | null;
};

export function DraftCard({ draft }: { draft: Draft }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (done) return null;

  const book = draft.books;

  async function handleAction(action: "approve" | "reject" | "regenerate") {
    setLoading(action);
    try {
      const res = await fetch(`/api/admin/drafts/${draft.id}/${action}`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.ok) {
        setDone(true);
      } else {
        alert(`실패: ${data.error}`);
      }
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* 상단 */}
      <div className="p-5">
        <div className="flex gap-4 items-start">
          {book?.cover_url && (
            <Image
              src={book.cover_url}
              alt={book.title}
              width={64}
              height={88}
              className="rounded object-cover shrink-0"
              unoptimized
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[#C67856] font-semibold mb-1">
              {draft.theme ?? "오늘의 책"}
            </p>
            <h2 className="font-bold text-[#2C2416] text-base leading-snug">
              《{book?.title ?? "제목 없음"}》
            </h2>
            <p className="text-sm text-[#8B7B6B] mt-0.5">{book?.author}</p>
          </div>
          <span className="text-xs text-[#8B7B6B] shrink-0">
            {new Date(draft.created_at).toLocaleString("ko-KR", {
              month: "numeric",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        {draft.selection_reason && (
          <p className="mt-3 text-sm text-[#8B7B6B] italic border-l-2 border-[#C67856] pl-3">
            {draft.selection_reason}
          </p>
        )}
      </div>

      {/* 캡션 */}
      <div className="px-5 pb-4">
        <p className="text-sm text-[#2C2416] whitespace-pre-wrap leading-relaxed">
          {draft.caption}
        </p>
        <p className="text-xs text-blue-500 mt-2 leading-relaxed">
          {draft.hashtags?.join(" ")}
        </p>
      </div>

      {/* 버튼 영역 — 모바일 하단 고정 느낌으로 */}
      <div className="border-t border-[#F5F0E8] p-4 flex gap-2">
        <button
          onClick={() => handleAction("approve")}
          disabled={loading !== null}
          className="flex-1 bg-[#2C2416] text-white py-3 rounded-xl text-sm font-semibold disabled:opacity-50 active:scale-95 transition-transform"
        >
          {loading === "approve" ? "처리 중…" : "✅ 승인"}
        </button>
        <button
          onClick={() => handleAction("regenerate")}
          disabled={loading !== null}
          className="flex-1 bg-[#F5F0E8] text-[#2C2416] py-3 rounded-xl text-sm font-semibold disabled:opacity-50 active:scale-95 transition-transform"
        >
          {loading === "regenerate" ? "생성 중…" : "🔄 재생성"}
        </button>
        <button
          onClick={() => handleAction("reject")}
          disabled={loading !== null}
          className="px-4 bg-[#F5F0E8] text-red-500 py-3 rounded-xl text-sm font-semibold disabled:opacity-50 active:scale-95 transition-transform"
        >
          {loading === "reject" ? "…" : "✕"}
        </button>
      </div>
    </div>
  );
}
