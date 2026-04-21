"use client";

import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#F5F0E8",
        fontFamily: "system-ui",
      }}
    >
      <div
        style={{
          textAlign: "center",
          padding: "48px 40px",
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 2px 16px rgba(0,0,0,0.08)",
          minWidth: 300,
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 8 }}>📚</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, color: "#2C2416" }}>
          todayBooks
        </h1>
        <p style={{ color: "#8B7B6B", fontSize: 14, marginBottom: 32 }}>
          관리자 페이지
        </p>
        <button
          onClick={() => signIn("google", { callbackUrl: "/" })}
          style={{
            width: "100%",
            padding: "12px 24px",
            background: "#2C2416",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Google 계정으로 로그인
        </button>
      </div>
    </div>
  );
}
