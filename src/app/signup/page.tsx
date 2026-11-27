"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, password }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || "Unable to create account. Please try again.");
        setLoading(false);
        return;
      }

      if (data?.needsEmailConfirmation) {
        setSuccessMsg(
          data.message || "Account created! Please check your email to confirm your account."
        );
        setLoading(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Network error while creating account. Please try again.");
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
            Create your account
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

        {successMsg && (
          <div
            role="status"
            className="mb-4 px-3.5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-[12.5px] font-medium"
          >
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label
              htmlFor="signup-email"
              className="block text-[12px] font-semibold text-[var(--ui-muted)] mb-1"
            >
              Email
            </label>
            <input
              id="signup-email"
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
              htmlFor="signup-password"
              className="block text-[12px] font-semibold text-[var(--ui-muted)] mb-1"
            >
              Password
            </label>
            <input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--ui-sheet)] border border-[var(--ui-border)] text-[14px] text-[var(--ui-text)] placeholder-[var(--ui-muted)] focus:outline-none focus:border-[#0066ff]"
            />
          </div>

          <div>
            <label
              htmlFor="signup-confirm"
              className="block text-[12px] font-semibold text-[var(--ui-muted)] mb-1"
            >
              Confirm Password
            </label>
            <input
              id="signup-confirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat password"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--ui-sheet)] border border-[var(--ui-border)] text-[14px] text-[var(--ui-text)] placeholder-[var(--ui-muted)] focus:outline-none focus:border-[#0066ff]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[#0066ff] hover:bg-[#0050cb] disabled:opacity-50 text-white font-bold text-[14px] shadow-sm transition-all active:scale-[0.98] cursor-pointer"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="mt-5 text-center text-[12.5px] text-[var(--ui-muted)]">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-[#0066ff] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
