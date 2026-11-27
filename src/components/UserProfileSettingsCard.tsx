"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { USER_DPS, useSettings } from "@/lib/settings";

interface UserInfo {
  email: string;
  name: string;
  providers: string[];
}

export function UserProfileSettingsCard() {
  const { s, setAvatar } = useSettings();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [dpModalOpen, setDpModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        const metaProviders = Array.isArray(user.app_metadata?.providers)
          ? (user.app_metadata.providers as string[])
          : [];
        const identityProviders = Array.isArray(user.identities)
          ? user.identities.map((i) => i.provider).filter(Boolean)
          : [];
        const providers = Array.from(
          new Set([
            ...metaProviders,
            ...identityProviders,
            ...(user.app_metadata?.provider ? [String(user.app_metadata.provider)] : []),
          ])
        );

        const displayName =
          (user.user_metadata?.full_name as string) ||
          (user.user_metadata?.name as string) ||
          (user.email ? user.email.split("@")[0] : "User");

        setUserInfo({
          email: user.email || "Signed in user",
          name: displayName,
          providers: providers.length > 0 ? providers : ["email"],
        });
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasGoogle = userInfo?.providers.includes("google");
  const hasApple = userInfo?.providers.includes("apple");
  const hasEmail = userInfo?.providers.includes("email") || (!hasGoogle && !hasApple);

  return (
    <>
      <div className="bg-[var(--ui-card)] p-4 sm:p-5 rounded-2xl shadow-sm border border-[var(--ui-border)] space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <button
              type="button"
              onClick={() => setDpModalOpen(true)}
              aria-label="Change profile picture"
              className="relative group shrink-0 cursor-pointer"
            >
              <img
                src={s.avatar || USER_DPS[0]}
                alt="Your DP"
                className="w-14 h-14 rounded-2xl object-cover border-2 border-[var(--ui-border)] shadow-sm group-hover:opacity-90 transition-opacity"
              />
              <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#0066ff] text-white flex items-center justify-center shadow-sm border-2 border-[var(--ui-card)]">
                <span className="material-symbols-outlined text-[13px]">photo_camera</span>
              </span>
            </button>

            <div className="min-w-0">
              <div className="text-[15px] font-bold text-[var(--ui-text)] truncate font-headline">
                {userInfo?.name || "Loading profile..."}
              </div>
              <div className="text-[12px] text-[var(--ui-muted)] truncate">
                {userInfo?.email || "Fetching login details..."}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setDpModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-[var(--ui-sheet)] hover:bg-zinc-200/70 dark:hover:bg-zinc-800 border border-[var(--ui-border)] text-[11.5px] font-semibold text-[var(--ui-text)] shrink-0 cursor-pointer transition-colors"
          >
            Change DP
          </button>
        </div>

        {/* Synced Apps */}
        <div className="pt-3 border-t border-[var(--ui-border)] flex items-center justify-between flex-wrap gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--ui-muted)]">
            Synced Apps
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            {hasGoogle && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--ui-sheet)] border border-[var(--ui-border)] text-[11.5px] font-semibold text-[var(--ui-text)]">
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                  />
                </svg>
                <span>Google</span>
              </span>
            )}

            {hasApple && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--ui-sheet)] border border-[var(--ui-border)] text-[11.5px] font-semibold text-[var(--ui-text)]">
                <svg className="w-3.5 h-3.5 shrink-0 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43Zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.377 0-2.332-1.26-3.428-2.8-1.287-1.82-2.323-4.63-2.323-7.28 0-4.28 2.797-6.55 5.552-6.55 1.448 0 2.675.95 3.6.95.865 0 2.222-1.01 3.902-1.01.613 0 2.886.06 4.374 2.19-.13.09-2.383 1.37-2.383 4.19 0 3.26 2.854 4.42 2.955 4.45Z" />
                </svg>
                <span>Apple</span>
              </span>
            )}

            {hasEmail && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--ui-sheet)] border border-[var(--ui-border)] text-[11.5px] font-semibold text-[var(--ui-text)]">
                <span className="material-symbols-outlined text-[14px] text-[#0066ff]">mail</span>
                <span>Email</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* DP Picker Popup */}
      {dpModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
          onClick={() => setDpModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-[24px] bg-[var(--ui-card)] border border-[var(--ui-border)] shadow-2xl p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[16px] font-bold text-[var(--ui-text)] font-headline">
                  Choose Your DP
                </h3>
                <p className="text-[12px] text-[var(--ui-muted)]">
                  Pick an avatar for your profile &amp; chats
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDpModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--ui-muted)] hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {USER_DPS.map((dpUrl, idx) => {
                const selected = (s.avatar || USER_DPS[0]) === dpUrl;
                return (
                  <button
                    key={dpUrl}
                    type="button"
                    onClick={() => {
                      setAvatar(dpUrl);
                      setDpModalOpen(false);
                    }}
                    className={`relative rounded-2xl overflow-hidden border-2 transition-all cursor-pointer active:scale-95 ${
                      selected
                        ? "border-[#0066ff] ring-2 ring-[#0066ff]/30 shadow-md"
                        : "border-[var(--ui-border)] hover:border-zinc-400"
                    }`}
                  >
                    <img
                      src={dpUrl}
                      alt={`Avatar ${idx + 1}`}
                      className="w-full aspect-square object-cover"
                    />
                    {selected && (
                      <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#0066ff] text-white flex items-center justify-center shadow-xs">
                        <span className="material-symbols-outlined text-[13px]">check</span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
