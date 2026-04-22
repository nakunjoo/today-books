"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import type { CardContentSchema } from "@/lib/ai/schema";

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
  const [inputMode, setInputMode] = useState<"existing" | "screenshot">("existing");
  const [images, setImages] = useState<string[]>([]);
  const [extractedDesc, setExtractedDesc] = useState<string | null>(null);
  const [chosenDesc, setChosenDesc] = useState<"existing" | "extracted" | null>(null);
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

  async function handleExtract() {
    if (images.length === 0) return alert("스크린샷을 첨부해주세요");
    setLoading("extract");
    try {
      const res = await fetch(`/api/admin/drafts/${draft.id}/extract-description`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: images.map((dataUrl) => ({ base64: dataUrl.split(",")[1], mimeType: "image/jpeg" })),
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setExtractedDesc(data.description);
        setChosenDesc(null);
      } else {
        alert(`실패: ${data.error}`);
      }
    } finally {
      setLoading(null);
    }
  }

  async function handleGenerateContent() {
    setLoading("generate");
    try {
      let body: Record<string, unknown>;

      if (inputMode === "screenshot" && chosenDesc !== null) {
        // 비교 후 선택한 쪽으로 생성
        body = chosenDesc === "extracted"
          ? { description: extractedDesc }
          : { useExisting: true };
      } else if (inputMode === "existing") {
        if (!draft.description?.trim()) return alert("저장된 소개글이 없습니다.");
        body = { useExisting: true };
      } else {
        if (images.length === 0) return alert("스크린샷을 첨부해주세요");
        body = {
          images: images.map((dataUrl) => ({
            base64: dataUrl.split(",")[1],
            mimeType: "image/jpeg",
          })),
        };
      }

      const res = await fetch(`/api/admin/drafts/${draft.id}/generate-content`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
        <div className="px-4 py-4 border-t border-[#F5F0E8]">
          {/* 모드 탭 */}
          <div className="flex rounded-xl overflow-hidden border border-[#EDE5D8] mb-3">
            <button
              onClick={() => setInputMode("existing")}
              className={`flex-1 py-2 text-xs font-semibold transition-colors ${inputMode === "existing" ? "bg-[#2C2416] text-white" : "bg-white text-[#8B7B6B]"}`}
            >
              기본 소개글 사용
            </button>
            <button
              onClick={() => setInputMode("screenshot")}
              className={`flex-1 py-2 text-xs font-semibold transition-colors ${inputMode === "screenshot" ? "bg-[#2C2416] text-white" : "bg-white text-[#8B7B6B]"}`}
            >
              스크린샷 첨부
            </button>
          </div>

          {/* 기본 소개글 모드 */}
          {inputMode === "existing" && (
            <div>
              {draft.description?.trim() ? (
                <p className="text-xs text-[#5a4f46] leading-relaxed bg-[#F5F0E8] rounded-xl p-3 max-h-36 overflow-y-auto whitespace-pre-wrap">
                  {draft.description}
                </p>
              ) : (
                <div className="flex flex-col items-center gap-1.5 py-4 text-center">
                  <p className="text-xs text-[#8B7B6B]">저장된 소개글이 없어요.</p>
                  <p className="text-xs text-[#C0B4A8]">스크린샷 첨부를 이용해주세요.</p>
                </div>
              )}
            </div>
          )}

          {/* 스크린샷 모드 */}
          {inputMode === "screenshot" && (
            <div>
              {/* 이미지 업로드 영역 */}
              {!extractedDesc && (
                <>
                  {draft.isbn13 && (
                    <div className="flex justify-end mb-2">
                      <a
                        href={`https://www.aladin.co.kr/shop/wproduct.aspx?ISBN=${draft.isbn13}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[#C67856] font-semibold underline underline-offset-2"
                      >
                        알라딘 페이지 열기
                      </a>
                    </div>
                  )}
                  {images.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-1 mb-2">
                      {images.map((src, i) => (
                        <div key={i} className="relative shrink-0 w-20 h-28 rounded-lg overflow-hidden border border-[#EDE5D8]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={src} alt={`스크린샷 ${i + 1}`} className="w-full h-full object-cover" />
                          <button
                            onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                            className="absolute top-0.5 right-0.5 bg-black/60 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center leading-none"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {images.length < 5 && (
                    <label className="flex items-center justify-center gap-2 w-full h-12 border-2 border-dashed border-[#EDE5D8] rounded-xl cursor-pointer active:bg-[#F5F0E8] transition-colors">
                      <span className="text-lg">📷</span>
                      <span className="text-xs text-[#8B7B6B]">
                        {images.length === 0 ? "스크린샷 첨부" : `추가 (${images.length}/5)`}
                      </span>
                      <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageChange} />
                    </label>
                  )}
                  {images.length > 0 && (
                    <button
                      onClick={handleExtract}
                      disabled={loading !== null}
                      className="w-full mt-2 bg-[#EDE5D8] text-[#2C2416] py-2 rounded-xl text-xs font-semibold disabled:opacity-50"
                    >
                      {loading === "extract" ? "소개글 추출 중…" : "소개글 추출해서 비교하기"}
                    </button>
                  )}
                </>
              )}

              {/* 비교 화면 */}
              {extractedDesc && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[#2C2416]">어떤 소개글로 슬라이드 만들까요?</p>

                  {/* 기본 소개글 */}
                  <button
                    onClick={() => setChosenDesc("existing")}
                    className={`w-full text-left rounded-xl border-2 p-3 transition-colors ${chosenDesc === "existing" ? "border-[#C67856] bg-[#FFF7F3]" : "border-[#EDE5D8] bg-[#F5F0E8]"}`}
                  >
                    <p className="text-xs font-semibold text-[#8B7B6B] mb-1">📦 알라딘 API 소개글</p>
                    <p className="text-xs text-[#5a4f46] leading-relaxed line-clamp-4 whitespace-pre-wrap">
                      {draft.description?.trim() || "(없음)"}
                    </p>
                  </button>

                  {/* 스크린샷 추출 */}
                  <button
                    onClick={() => setChosenDesc("extracted")}
                    className={`w-full text-left rounded-xl border-2 p-3 transition-colors ${chosenDesc === "extracted" ? "border-[#C67856] bg-[#FFF7F3]" : "border-[#EDE5D8] bg-[#F5F0E8]"}`}
                  >
                    <p className="text-xs font-semibold text-[#8B7B6B] mb-1">📷 스크린샷 추출 소개글</p>
                    <p className="text-xs text-[#5a4f46] leading-relaxed line-clamp-4 whitespace-pre-wrap">
                      {extractedDesc}
                    </p>
                  </button>

                  <button
                    onClick={() => { setExtractedDesc(null); setChosenDesc(null); }}
                    className="text-xs text-[#8B7B6B] underline underline-offset-2"
                  >
                    다시 스크린샷 선택
                  </button>
                </div>
              )}
            </div>
          )}
          <button
            onClick={handleGenerateContent}
            disabled={loading !== null || (inputMode === "screenshot" && extractedDesc !== null && chosenDesc === null)}
            className="w-full mt-3 bg-[#C67856] text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 active:scale-95 transition-transform"
          >
            {loading === "generate"
              ? "슬라이드 생성 중…"
              : inputMode === "screenshot" && extractedDesc && chosenDesc === null
                ? "소개글을 선택해주세요"
                : "슬라이드 생성"}
          </button>
          <button
            onClick={() => handleAction("reject")}
            disabled={loading !== null}
            className="w-full mt-2 bg-[#F5F0E8] text-red-400 py-2 rounded-xl text-sm disabled:opacity-50"
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
              <div key={i} className="shrink-0 w-full aspect-square" style={{ scrollSnapAlign: "center" }}>
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
    </div>
  );
}
