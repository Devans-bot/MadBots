"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/";
  const urlError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(urlError);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("Please enter both your email and password.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (signInErr) {
        setError(signInErr.message || "Invalid email or password.");
        setLoading(false);
        return;
      }

      const safeNext = nextPath.startsWith("/") ? nextPath : "/";
      router.push(safeNext);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh w-full flex flex-col items-center justify-center bg-[var(--ui-bg)] madbots-graph-grid px-4 py-8">
      <div className="w-full max-w-sm rounded-[24px] bg-[var(--ui-card)] border border-[var(--ui-border)] shadow-[0_12px_40px_rgba(0,0,0,0.08)] p-6">
        <div className="flex flex-col items-center text-center mb-6">
          <img
            src="/icon-512.jpg"
            alt="MaDbotS"
            className="w-14 h-14 rounded-2xl object-cover border border-zinc-300 dark:border-zinc-700 shadow-xs mb-3"
          />
          <h1 className="font-black text-2xl tracking-tighter text-[#22439E] dark:text-[#5b82e8] font-headline">
            MaDbotS<span className="text-[#FF2B85]">*</span>
          </h1>
          <p className="text-[13px] text-[var(--ui-muted)] mt-1">
            Sign in to access your AI agents
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 px-3.5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-[12.5px] font-medium"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label
              htmlFor="login-email"
              className="block text-[12px] font-semibold text-[var(--ui-muted)] mb-1"
            >
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--ui-sheet)] border border-[var(--ui-border)] text-[14px] text-[var(--ui-text)] placeholder-[var(--ui-muted)] focus:outline-none focus:border-[#0066ff]"
            />
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="block text-[12px] font-semibold text-[var(--ui-muted)] mb-1"
            >
              Password
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--ui-sheet)] border border-[var(--ui-border)] text-[14px] text-[var(--ui-text)] placeholder-[var(--ui-muted)] focus:outline-none focus:border-[#0066ff]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[#0066ff] hover:bg-[#0050cb] disabled:opacity-50 text-white font-bold text-[14px] shadow-sm transition-all active:scale-[0.98] cursor-pointer"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="mt-5 text-center text-[12.5px] text-[var(--ui-muted)]">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-semibold text-[#0066ff] hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[var(--ui-bg)]" />}>
      <LoginForm />
    </Suspense>
  );
}
