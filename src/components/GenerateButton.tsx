"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function GenerateButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await fetch("/api/cron/daily-book");
      const data = await res.json();
      if (data.ok) {
        router.refresh();
      } else {
        alert(`실패: ${data.error}`);
      }
    } catch {
      alert("요청 실패");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleGenerate}
      disabled={loading}
      className="text-sm bg-[#C67856] text-white px-3 py-1.5 rounded-lg font-semibold disabled:opacity-50"
    >
      {loading ? "생성 중…" : "+ 초안 생성"}
    </button>
  );
}
