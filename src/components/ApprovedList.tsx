"use client";

import { useState } from "react";
import Image from "next/image";

type ApprovedBook = {
  id: string;
  title: string | null;
  author: string | null;
  cover_url: string | null;
  created_at: string;
  instagram_post_id?: string | null;
};

export function ApprovedList({ books, published = false }: { books: ApprovedBook[]; published?: boolean }) {
  const [list, setList] = useState(books);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);

  async function handlePublish(id: string) {
    if (!confirm("Instagram에 게시할까요?")) return;
    setPublishing(id);
    try {
      const res = await fetch(`/api/admin/drafts/${id}/publish`, { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setList((prev) => prev.map((b) => b.id === id ? { ...b, published: true } : b));
        alert("✅ Instagram 게시 완료!");
      } else {
        alert(`실패: ${data.error}`);
      }
    } finally {
      setPublishing(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("삭제하면 복구할 수 없어요. 계속할까요?")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/drafts/${id}/delete`, { method: "POST" });
      const data = await res.json();
      if (data.ok) setList((prev) => prev.filter((b) => b.id !== id));
      else alert(`실패: ${data.error}`);
    } finally {
      setDeleting(null);
    }
  }

  if (list.length === 0) return null;

  return (
    <section>
      <p className="text-sm font-semibold text-[#2C2416] mb-3">{published ? "게시 완료" : "승인됨"} {list.length}건</p>
      <div className="flex flex-col gap-2">
        {list.map((book) => (
          <div key={book.id} className="bg-white rounded-xl px-3 py-2.5 flex items-center gap-3 shadow-sm">
            {book.cover_url ? (
              <Image
                src={book.cover_url}
                alt={book.title ?? ""}
                width={36}
                height={50}
                className="rounded object-cover shrink-0"
                style={{ width: 36, height: 50 }}
                unoptimized
              />
            ) : (
              <div className="w-9 h-12 rounded bg-[#EDE5D8] shrink-0 flex items-center justify-center text-[#C67856] text-xs font-bold">B</div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#2C2416] truncate">{book.title}</p>
              <p className="text-xs text-[#8B7B6B]">{book.author}</p>
            </div>
            <p className="text-xs text-[#8B7B6B] shrink-0 mr-2">
              {new Date(book.created_at).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })}
            </p>
            {!published && (
              <button
                onClick={() => handlePublish(book.id)}
                disabled={publishing === book.id || deleting === book.id}
                className="text-white text-xs px-2 py-1 rounded-lg bg-[#C67856] disabled:opacity-40 shrink-0"
              >
                {publishing === book.id ? "…" : "📤"}
              </button>
            )}
            <button
              onClick={() => handleDelete(book.id)}
              disabled={deleting === book.id || publishing === book.id}
              className="text-red-400 text-xs px-2 py-1 rounded-lg bg-red-50 disabled:opacity-40 shrink-0"
            >
              {deleting === book.id ? "…" : "삭제"}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
