import { supabaseAdmin } from "@/lib/supabase/server";
import { DraftCard } from "./DraftCard";

export const dynamic = "force-dynamic";

export default async function DraftsPage() {
  const db = supabaseAdmin();

  const { data: drafts, error } = await db
    .from("drafts")
    .select(
      `
      id, status, theme, selection_reason, hook,
      caption, hashtags, content, created_at,
      books ( id, title, author, cover_url )
    `,
    )
    .eq("status", "pending_review")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="text-red-600 text-sm p-4 bg-red-50 rounded-lg">
        오류: {error.message}
      </div>
    );
  }

  if (!drafts || drafts.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-4xl mb-4">✅</p>
        <p className="text-[#2C2416] font-semibold text-lg">검토 대기 초안 없음</p>
        <p className="text-[#8B7B6B] text-sm mt-1">
          모든 초안이 처리됐거나 아직 생성 전이에요.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-[#2C2416]">
          검토 대기 ({drafts.length})
        </h1>
      </div>
      <div className="flex flex-col gap-4">
        {drafts.map((draft) => (
          <DraftCard key={draft.id} draft={draft as never} />
        ))}
      </div>
    </div>
  );
}
