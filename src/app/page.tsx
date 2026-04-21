import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
import { DraftCard, type Draft } from "@/components/DraftCard";
import { GenerateButton } from "@/components/GenerateButton";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth();
  if (!session) redirect("/login");

  const db = supabaseAdmin();
  const { data: drafts, error } = await db
    .from("drafts")
    .select("id, status, theme, selection_reason, hook, caption, hashtags, content, created_at, title, author, cover_url")
    .eq("status", "pending_review")
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-[#F5F0E8]">
      <header className="bg-[#2C2416] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <span className="font-bold text-base tracking-tight">📚 todayBooks</span>
          <GenerateButton />
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

      <main className="max-w-lg mx-auto px-4 py-5">
        {error ? (
          <div className="text-red-600 text-sm p-4 bg-red-50 rounded-xl">오류: {error.message}</div>
        ) : !drafts || drafts.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-5xl mb-4">✅</p>
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
      </main>
    </div>
  );
}
