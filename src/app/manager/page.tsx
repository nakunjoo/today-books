import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
import { DraftCard, type Draft } from "@/components/DraftCard";
import { GenerateButton } from "@/components/GenerateButton";
import { ApprovedList } from "@/components/ApprovedList";
import { DebugButton } from "@/components/DebugButton";

export const dynamic = "force-dynamic";

type ApprovedBook = {
  id: string;
  title: string | null;
  author: string | null;
  cover_url: string | null;
  isbn13: string | null;
  created_at: string;
};

export default async function ManagerPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const db = supabaseAdmin();
  const [{ data: drafts, error }, { data: approved }] = await Promise.all([
    db.from("drafts")
      .select("id, status, theme, selection_reason, hook, caption, hashtags, content, created_at, title, author, cover_url, isbn13")
      .eq("status", "pending_review")
      .order("created_at", { ascending: false }),
    db.from("drafts")
      .select("id, title, author, cover_url, isbn13, created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="min-h-screen bg-[#F5F0E8]">
      <header className="bg-[#2C2416] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <span className="font-bold text-base tracking-tight">📚 todayBooks</span>
          <GenerateButton />
          <DebugButton />
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button type="submit" className="text-xs text-[#C67856] hover:text-white transition-colors">
            로그아웃
          </button>
        </form>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-8">
        {/* 검토 대기 */}
        <section>
          {error ? (
            <div className="text-red-600 text-sm p-4 bg-red-50 rounded-xl">오류: {error.message}</div>
          ) : !drafts || drafts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-3xl mb-3">✅</p>
              <p className="text-[#2C2416] font-semibold">검토 대기 초안 없음</p>
              <p className="text-[#8B7B6B] text-sm mt-1">모든 초안이 처리됐거나 아직 생성 전이에요.</p>
            </div>
          ) : (
            <>
              <p className="text-sm font-semibold text-[#2C2416] mb-3">검토 대기 {drafts.length}건</p>
              <div className="flex flex-col gap-3">
                {(drafts as Draft[]).map((draft) => (
                  <DraftCard key={draft.id} draft={draft} />
                ))}
              </div>
            </>
          )}
        </section>

        {/* 승인된 게시물 */}
        {approved && approved.length > 0 && (
          <ApprovedList books={approved as ApprovedBook[]} />
        )}
      </main>
    </div>
  );
}
