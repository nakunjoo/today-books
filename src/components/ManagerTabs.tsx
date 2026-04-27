"use client";

import { useState } from "react";
import { DraftCard, type Draft } from "./DraftCard";
import { ApprovedList } from "./ApprovedList";

type ApprovedBook = {
  id: string;
  title: string | null;
  author: string | null;
  cover_url: string | null;
  isbn13: string | null;
  created_at: string;
  instagram_post_id?: string | null;
};

type Props = {
  drafts: Draft[];
  draftsError: string | null;
  approved: ApprovedBook[];
  published: ApprovedBook[];
};

const TABS = [
  { key: "pending", label: "대기" },
  { key: "approved", label: "승인됨" },
  { key: "published", label: "게시 완료" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function ManagerTabs({ drafts, draftsError, approved, published }: Props) {
  const [tab, setTab] = useState<TabKey>("pending");

  return (
    <div>
      {/* 탭 */}
      <div className="flex rounded-xl overflow-hidden border border-[#EDE5D8] mb-5 bg-white">
        {TABS.map((t) => {
          const count = t.key === "pending" ? drafts.length : t.key === "approved" ? approved.length : published.length;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2.5 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${tab === t.key ? "bg-[#2C2416] text-white" : "text-[#8B7B6B]"}`}
            >
              {t.label}
              {count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${tab === t.key ? "bg-white/20" : "bg-[#EDE5D8] text-[#2C2416]"}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 대기 */}
      {tab === "pending" && (
        draftsError ? (
          <div className="text-red-600 text-sm p-4 bg-red-50 rounded-xl">오류: {draftsError}</div>
        ) : drafts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-3xl mb-3">✅</p>
            <p className="text-[#2C2416] font-semibold">검토 대기 초안 없음</p>
            <p className="text-[#8B7B6B] text-sm mt-1">모든 초안이 처리됐거나 아직 생성 전이에요.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {drafts.map((draft) => (
              <DraftCard key={draft.id} draft={draft} />
            ))}
          </div>
        )
      )}

      {/* 승인됨 */}
      {tab === "approved" && (
        approved.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-3xl mb-3">📋</p>
            <p className="text-[#2C2416] font-semibold">승인된 초안 없음</p>
          </div>
        ) : (
          <ApprovedList books={approved} />
        )
      )}

      {/* 게시 완료 */}
      {tab === "published" && (
        published.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-3xl mb-3">📤</p>
            <p className="text-[#2C2416] font-semibold">게시된 게시물 없음</p>
          </div>
        ) : (
          <ApprovedList books={published} published />
        )
      )}
    </div>
  );
}
