"use client";

import { useState } from "react";

export function DebugButton() {
  const [loading, setLoading] = useState(false);

  async function handleDebug() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/debug/aladin");
      const data = await res.json();
      console.log("=== 알라딘 신간 ===", data.newBooks);
      console.log("=== 알라딘 베스트셀러 ===", data.bestBooks);
      console.log("=== LLM 선정 결과 ===", data.selected);
      console.log("=== 선정 책 상세정보 (isbn13 조회) ===", data.detail);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDebug}
      disabled={loading}
      className="text-xs text-white/40 px-2 py-1 rounded disabled:opacity-30"
    >
      {loading ? "…" : "디버그"}
    </button>
  );
}
