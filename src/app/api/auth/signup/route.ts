import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    const allowSignup = String(process.env.ALLOW_SIGNUP ?? "true").toLowerCase() !== "false";

    if (!allowSignup) {
      const admin = getSupabaseAdmin();
      if (!admin) {
        return NextResponse.json(
          { error: "Signup verification is temporarily unavailable." },
          { status: 500 }
        );
      }

      const { data: allowed, error: allowErr } = await admin
        .from("allowed_emails")
        .select("email")
        .ilike("email", email)
        .maybeSingle();

      if (allowErr) {
        console.error("[Auth Signup] allowed_emails lookup failed:", allowErr.message);
        return NextResponse.json(
          { error: "Signups are invite-only and invite verification failed." },
          { status: 403 }
        );
      }

      if (!allowed) {
        return NextResponse.json(
          { error: "Signups are invite-only. This email is not on the allowlist." },
          { status: 403 }
        );
      }
    }

    const origin = new URL(request.url).origin;
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const needsEmailConfirmation = !data.session;
    return NextResponse.json({
      ok: true,
      needsEmailConfirmation,
      message: needsEmailConfirmation
        ? "Account created! Please check your email to confirm your account before signing in."
        : "Account created! Redirecting...",
    });
  } catch (err) {
    console.error("[Auth Signup] Unexpected error:", err);
    return NextResponse.json(
      { error: "Unable to create account right now. Please try again." },
      { status: 500 }
    );
  }
}
