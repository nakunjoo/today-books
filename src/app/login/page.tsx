"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { normalizeUsername, toAuthEmail } from "@/lib/username";

// tarot-saju 관리자 계정(아이디/비밀번호)으로 로그인
// useSearchParams는 Suspense 안에서만 쓸 수 있어서 폼을 분리
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "forbidden" ? "관리자 권한이 없는 계정이에요." : null,
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const username = normalizeUsername(id);
    if (!username) {
      setError("아이디는 영문 소문자·숫자 4~20자예요.");
      return;
    }

    setLoading(true);
    setError(null);
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const { error } = await supabase.auth.signInWithPassword({ email: toAuthEmail(username), password });
    if (error) {
      setLoading(false);
      setError("아이디 또는 비밀번호가 맞지 않아요.");
      return;
    }
    router.replace("/manager");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5F0E8] px-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white rounded-2xl shadow-sm px-8 py-10 text-center">
        <p className="text-4xl mb-3">📚</p>
        <h1 className="text-xl font-bold text-[#2C2416] mb-1">todayBooks</h1>
        <p className="text-sm text-[#8B7B6B] mb-8">관리자 페이지</p>
        <input
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          placeholder="아이디"
          value={id}
          onChange={(e) => setId(e.target.value)}
          className="w-full mb-2 px-4 py-3 rounded-xl border border-[#E5DCCD] text-sm text-[#2C2416] outline-none focus:border-[#2C2416]"
        />
        <input
          type="password"
          autoComplete="current-password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 px-4 py-3 rounded-xl border border-[#E5DCCD] text-sm text-[#2C2416] outline-none focus:border-[#2C2416]"
        />
        {error && <p className="text-xs text-[#C67856] mb-3">{error}</p>}
        <button
          type="submit"
          disabled={loading || !id || !password}
          className="w-full py-3 bg-[#2C2416] text-white rounded-xl text-sm font-semibold active:scale-95 transition-transform disabled:opacity-40"
        >
          {loading ? "로그인 중…" : "로그인"}
        </button>
      </form>
    </div>
  );
}
