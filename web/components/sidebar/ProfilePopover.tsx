"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { LogOut, User, ChevronDown } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function ProfilePopover() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const { user, logout: authLogout } = useAuth();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await authLogout();
    } catch {
      setLoggingOut(false);
    }
  };

  const initial = (user?.display_name || user?.email || "U").charAt(0).toUpperCase();
  const name = user?.display_name || user?.email?.split("@")[0] || "User";

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] transition-colors ${
          open
            ? "bg-[var(--background)]/70 font-medium text-[var(--foreground)]"
            : "text-[var(--muted-foreground)] hover:bg-[var(--background)]/50 hover:text-[var(--foreground)]"
        }`}
      >
        <User size={16} strokeWidth={1.6} className="shrink-0 text-[var(--primary)]" />
        <div className="min-w-0 flex-1 text-left">
          <div className="text-[13px] font-medium text-[var(--foreground)] truncate">
            {name}
          </div>
          <div className="text-[11px] text-[var(--muted-foreground)] truncate">
            {user?.email}
          </div>
        </div>
        <ChevronDown
          size={14}
          className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="ml-2 border-l border-[var(--border)]/30 pl-2 mt-1 space-y-0.5">
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors ${
              pathname === "/profile"
                ? "bg-[var(--background)]/70 font-medium text-[var(--foreground)]"
                : "text-[var(--muted-foreground)] hover:bg-[var(--background)]/50 hover:text-[var(--foreground)]"
            }`}
          >
            <User size={15} strokeWidth={1.6} />
            <span>{t("Profile")}</span>
          </Link>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-[var(--muted-foreground)] hover:bg-[var(--background)]/50 hover:text-[var(--destructive)] transition-colors disabled:opacity-50"
          >
            <LogOut size={15} strokeWidth={1.6} />
            <span>{loggingOut ? t("Signing out...") : t("Sign out")}</span>
          </button>
        </div>
      )}
    </div>
  );
}
