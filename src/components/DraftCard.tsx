"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import type { CardContentSchema } from "@/lib/ai/schema";
import { CropModal } from "./CropModal";

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
  description: string | null;
};

function cardUrl(slide: string, data: Record<string, unknown>) {
  return `/api/card/${slide}?data=${encodeURIComponent(JSON.stringify(data))}`;
}

export function DraftCard({ draft }: { draft: Draft }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [cropIndex, setCropIndex] = useState<number | null>(null);
  const [mode, setMode] = useState<"description" | "screenshot">("screenshot");

  type PreviewVersion = { content: CardContentSchema; description: string };
  const [preview, setPreview] = useState<PreviewVersion | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  async function compressImage(file: File): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const MAX = 1400;
        const ratio = Math.min(1, MAX / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = url;
    });
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const compressed = await Promise.all(files.map(compressImage));
    setImages((prev) => [...prev, ...compressed].slice(0, 5)); // 최대 5장
    e.target.value = ""; // 같은 파일 재선택 허용
  }

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

  async function handlePreview() {
    const body: Record<string, unknown> = mode === "description"
      ? { useExisting: true }
      : { images: images.map((d) => ({ base64: d.split(",")[1], mimeType: "image/jpeg" })) };

    if (mode === "description" && !draft.description?.trim()) return alert("기본 소개글이 없어요");
    if (mode === "screenshot" && images.length === 0) return alert("스크린샷을 첨부해주세요");

    setLoading("preview");
    try {
      const res = await fetch(`/api/admin/drafts/${draft.id}/preview-content`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.ok) {
        setPreview({ content: data.content, description: data.description });
      } else {
        alert(`실패: ${data.error}`);
      }
    } finally {
      setLoading(null);
    }
  }

  async function handleConfirm() {
    if (!preview) return;
    setLoading("confirm");
    try {
      const res = await fetch(`/api/admin/drafts/${draft.id}/save-content`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: preview.content, description: preview.description }),
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
        <div className="px-4 py-4 border-t border-[#F5F0E8] space-y-3">

          {/* 제목 + 알라딘 링크 */}
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-[#2C2416] truncate">{draft.title}</p>
            {draft.isbn13 && (
              <a href={`https://www.aladin.co.kr/shop/wproduct.aspx?ISBN=${draft.isbn13}`}
                target="_blank" rel="noopener noreferrer"
                className="text-xs text-[#C67856] font-semibold underline underline-offset-2 shrink-0">
                알라딘 페이지 열기
              </a>
            )}
          </div>

          {/* 간단 설명 */}
          <button
            type="button"
            onClick={() => setDescExpanded((v) => !v)}
            className={`text-left text-xs text-[#8B7B6B] whitespace-pre-wrap ${descExpanded ? "" : "line-clamp-3"}`}
          >
            {draft.description?.trim() || "소개글 없음"}
          </button>

          {/* 모드 선택 */}
          <div className="flex rounded-xl overflow-hidden border border-[#EDE5D8]">
            {([
              { value: "description", label: "기본 소개글" },
              { value: "screenshot", label: "스크린샷" },
            ] as const).map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setMode(opt.value); setPreview(null); }}
                className={`flex-1 py-2 text-xs font-semibold transition-colors ${mode === opt.value ? "bg-[#2C2416] text-white" : "bg-white text-[#8B7B6B]"}`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* 스크린샷 첨부 (스크린샷 모드만) */}
          {mode === "screenshot" && (
            <div className="rounded-xl border border-[#EDE5D8] overflow-hidden">
              <div className="px-3 py-2">
                {images.length > 0 ? (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {images.map((src, i) => (
                      <div key={i} className="relative shrink-0 w-14 h-20 rounded-lg overflow-hidden border border-[#EDE5D8]">
                        <button
                          type="button"
                          onClick={() => setCropIndex(i)}
                          className="block w-full h-full"
                          aria-label={`스크린샷 ${i + 1} 크롭`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={src} alt={`스크린샷 ${i + 1}`} className="w-full h-full object-cover" />
                        </button>
                        <button
                          onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                          className="absolute top-0.5 right-0.5 bg-black/60 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center leading-none"
                        >×</button>
                      </div>
                    ))}
                    {images.length < 5 && (
                      <label className="shrink-0 w-14 h-20 rounded-lg border-2 border-dashed border-[#EDE5D8] flex flex-col items-center justify-center cursor-pointer">
                        <span className="text-lg">+</span>
                        <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageChange} />
                      </label>
                    )}
                  </div>
                ) : (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-lg">📷</span>
                    <span className="text-xs text-[#8B7B6B]">스크린샷 첨부</span>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageChange} />
                  </label>
                )}
              </div>
            </div>
          )}

          {/* 슬라이드 미리보기 결과 */}
          {preview && (() => {
            const c = preview.content;
            const previewSlides = [
              cardUrl("cover", { hook: c.cover.hook, title: draft.title, author: draft.author }),
              cardUrl("book", { title: draft.title, author: draft.author, coverUrl: draft.cover_url, selectionReason: draft.selection_reason }),
              cardUrl("target", { title: c.targetReader.title, items: c.targetReader.items }),
              ...c.keyMessages.map((msg, i) => cardUrl("key", { point: i + 1, title: msg.title, description: msg.description, dark: i % 2 === 0 })),
              cardUrl("closing", { oneLiner: c.closing.oneLiner, readingTime: c.closing.readingTime, title: draft.title }),
            ];
            return (
              <div>
                <div className="rounded-xl overflow-hidden border border-[#EDE5D8]">
                  <div className="flex overflow-x-auto scrollbar-hide" style={{ scrollSnapType: "x mandatory" }}>
                    {previewSlides.map((url, i) => (
                      <div key={i} className="shrink-0 w-full aspect-square" style={{ scrollSnapAlign: "center", scrollSnapStop: "always" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={`슬라이드 ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleConfirm}
                  disabled={loading !== null}
                  className="w-full mt-2 bg-[#C67856] text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 active:scale-95 transition-transform"
                >
                  {loading === "confirm" ? "저장 중…" : "이 슬라이드로 확정"}
                </button>
              </div>
            );
          })()}

          {/* 슬라이드 미리보기 버튼 */}
          <button
            onClick={handlePreview}
            disabled={
              loading !== null ||
              (mode === "description" && !draft.description?.trim()) ||
              (mode === "screenshot" && images.length === 0)
            }
            className="w-full bg-[#2C2416] text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 active:scale-95 transition-transform"
          >
            {loading === "preview" ? "생성 중…" : preview ? "다시 미리보기" : "슬라이드 미리보기"}
          </button>

          <button
            onClick={() => handleAction("reject")}
            disabled={loading !== null}
            className="w-full bg-[#F5F0E8] text-red-400 py-2 rounded-xl text-sm disabled:opacity-50"
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
              <div key={i} className="shrink-0 w-full aspect-square" style={{ scrollSnapAlign: "center", scrollSnapStop: "always" }}>
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

      {/* AI가 추출한 소개글 확인 */}
      {!isPendingInput && draft.description && (
        <div className="px-3 pt-3 border-t border-[#F5F0E8]">
          <button
            onClick={() => setDescExpanded(!descExpanded)}
            className="flex items-center gap-1.5 text-xs text-[#8B7B6B] mb-1.5"
          >
            <span>{descExpanded ? "▲" : "▼"}</span>
            <span>AI가 읽은 소개글 확인</span>
          </button>
          {descExpanded && (
            <p className="text-xs text-[#5a4f46] leading-relaxed whitespace-pre-wrap bg-[#F5F0E8] rounded-xl p-3">
              {draft.description}
            </p>
          )}
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
      {cropIndex !== null && images[cropIndex] && (
        <CropModal
          src={images[cropIndex]}
          onClose={() => setCropIndex(null)}
          onApply={(cropped) => {
            setImages((prev) => prev.map((s, i) => (i === cropIndex ? cropped : s)));
            setCropIndex(null);
          }}
        />
      )}
    </div>
  );
}
