"use client";

import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5F0E8] px-6">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm px-8 py-10 text-center">
        <p className="text-4xl mb-3">📚</p>
        <h1 className="text-xl font-bold text-[#2C2416] mb-1">todayBooks</h1>
        <p className="text-sm text-[#8B7B6B] mb-8">관리자 페이지</p>
        <button
          onClick={() => signIn("google", { callbackUrl: "/manager" })}
          className="w-full py-3 bg-[#2C2416] text-white rounded-xl text-sm font-semibold active:scale-95 transition-transform"
        >
          Google 계정으로 로그인
        </button>
      </div>
    </div>
  );
}
