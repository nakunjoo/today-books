import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
import { type Draft } from "@/components/DraftCard";
import { GenerateButton } from "@/components/GenerateButton";
import { DebugButton } from "@/components/DebugButton";
import { ManagerTabs } from "@/components/ManagerTabs";

export const dynamic = "force-dynamic";

type ApprovedBook = {
  id: string;
  title: string | null;
  author: string | null;
  cover_url: string | null;
  isbn13: string | null;
  created_at: string;
  instagram_post_id?: string | null;
};

export default async function ManagerPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const db = supabaseAdmin();
  const [{ data: drafts, error }, { data: approved }, { data: published }] = await Promise.all([
    db.from("drafts")
      .select("id, status, theme, selection_reason, hook, caption, hashtags, content, created_at, title, author, cover_url, isbn13, description")
      .in("status", ["pending_input", "pending_review"])
      .order("created_at", { ascending: false }),
    db.from("drafts")
      .select("id, title, author, cover_url, isbn13, created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false }),
    db.from("drafts")
      .select("id, title, author, cover_url, isbn13, created_at, instagram_post_id")
      .eq("status", "published")
      .order("published_at", { ascending: false }),
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

      <main className="max-w-lg mx-auto px-4 py-5">
        <ManagerTabs
          drafts={(drafts ?? []) as Draft[]}
          draftsError={error?.message ?? null}
          approved={(approved ?? []) as ApprovedBook[]}
          published={(published ?? []) as ApprovedBook[]}
        />
      </main>
    </div>
  );
}
