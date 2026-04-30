"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { LogOut, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function CollapsedProfilePopover({
  userInitial,
  userName,
  userEmail,
}: {
  userInitial: string;
  userName: string;
  userEmail: string;
}) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const { logout: authLogout } = useAuth();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await authLogout();
    } catch {
      setLoggingOut(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold transition-colors ${
          open
            ? "bg-[var(--background)]/70 text-[var(--foreground)]"
            : "bg-[var(--primary)]/15 text-[var(--primary)] hover:bg-[var(--background)]/50 hover:text-[var(--foreground)]"
        }`}
      >
        {userInitial}
      </button>

      {open && (
        <div
          className="absolute left-full ml-2 top-0 z-50 w-44 rounded-lg border bg-white py-1 shadow-lg"
          style={{ borderColor: "#e2e8f0" }}
        >
          <div className="border-b px-3 py-2" style={{ borderColor: "#e2e8f0" }}>
            <p className="truncate text-[13px] font-medium text-[#1a202c]">
              {userName}
            </p>
            <p className="truncate text-[11px] text-[#718096]">
              {userEmail}
            </p>
          </div>

          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className={`flex items-center gap-2.5 px-3 py-2 text-[13px] transition-colors ${
              pathname === "/profile"
                ? "bg-[#f1f5f9] font-medium text-[#1a202c]"
                : "text-[#475569] hover:bg-[#f8fafc] hover:text-[#1a202c]"
            }`}
          >
            <User size={15} strokeWidth={1.6} />
            <span>{t("Profile")}</span>
          </Link>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-[#475569] transition-colors hover:bg-[#f8fafc] hover:text-[#dc2626] disabled:opacity-50"
          >
            <LogOut size={15} strokeWidth={1.6} />
            <span>{loggingOut ? t("Signing out...") : t("Sign out")}</span>
          </button>
        </div>
      )}
    </div>
  );
}
