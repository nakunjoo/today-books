import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { signOut } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-[#F5F0E8]">
      <header className="bg-[#2C2416] text-white px-5 py-3 flex items-center justify-between sticky top-0 z-10">
        <span className="font-bold text-lg tracking-tight">📚 todayBooks</span>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="text-sm text-[#C67856] hover:text-white transition-colors"
          >
            로그아웃
          </button>
        </form>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
