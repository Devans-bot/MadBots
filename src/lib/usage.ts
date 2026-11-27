import { getSupabaseAdmin } from "@/lib/supabase";
import { isOwnerUser } from "@/lib/calculateMacros";
import { getIstDateString } from "@/lib/macrosV2";

export function getDailyMessageLimit(): number {
  const raw = Number(process.env.DAILY_MESSAGE_LIMIT);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 30;
}

export async function checkAndIncrementUsage(userId: string | null | undefined): Promise<{
  allowed: boolean;
  count: number;
  limit: number;
  message?: string;
}> {
  const limit = getDailyMessageLimit();

  // Owner is exempt
  if (!userId || isOwnerUser(userId)) {
    return { allowed: true, count: 0, limit };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return { allowed: true, count: 0, limit };
  }

  const dayIst = getIstDateString();

  const { data: existing, error: readErr } = await admin
    .from("usage")
    .select("messages")
    .eq("user_id", userId)
    .eq("day_ist", dayIst)
    .maybeSingle();

  if (readErr) {
    console.error("[Usage] Failed to read usage:", readErr.message);
    return { allowed: true, count: 0, limit };
  }

  const current = Number(existing?.messages ?? 0);
  if (current >= limit) {
    return {
      allowed: false,
      count: current,
      limit,
      message: `Daily limit reached (${limit} messages/day). Please try again tomorrow after midnight IST.`,
    };
  }

  const nextCount = current + 1;
  const { error: upsertErr } = await admin
    .from("usage")
    .upsert(
      { user_id: userId, day_ist: dayIst, messages: nextCount },
      { onConflict: "user_id,day_ist" }
    );

  if (upsertErr) {
    console.error("[Usage] Failed to increment usage:", upsertErr.message);
  }

  return { allowed: true, count: nextCount, limit };
}
