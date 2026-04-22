"use client";

import { useState } from "react";

export function DebugButton() {
  const [loading, setLoading] = useState(false);

  async function handleDebug() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/debug/aladin");
      const data = await res.json();
      console.log("=== 알라딘 베스트셀러 ===", data.bestBooks);
      const sample = data.detailSample;
      const item = sample?.detailRaw?.item?.[0];
      console.log("=== 상세조회 (ItemLookUp) isbn13:", sample?.isbn13, " ===");
      console.log("item[0] keys:", item ? Object.keys(item) : "item 없음");
      console.log("item[0] JSON:", JSON.stringify(item, null, 2));
      console.log("subInfo keys:", item?.subInfo ? Object.keys(item.subInfo) : "subInfo 없음");
      console.log("subInfo JSON:", JSON.stringify(item?.subInfo, null, 2));
      console.log("=== getContents.aspx 응답 ===", sample?.contentsRaw);
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
