"use client";

import { useState } from "react";

export function DebugButton() {
  const [loading, setLoading] = useState(false);

  async function handleDebug() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/debug/books");
      const data = await res.json();
      console.log("=== 정보나루 인기대출 (소설) ===", data.loanBooks);
      console.log("=== 도서 상세 조회 isbn13:", data.detailSample?.isbn13, " ===");
      console.log(JSON.stringify(data.detailSample?.detail, null, 2));
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
