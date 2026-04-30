"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

interface RoleGuardProps {
  children: React.ReactNode;
  roles?: string[];
  redirectTo?: string;
}

export default function RoleGuard({
  children,
  roles,
  redirectTo = "/login",
}: RoleGuardProps) {
  const { isAuthenticated, isLoading, role } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace(redirectTo);
      return;
    }
    if (roles && roles.length > 0 && role && !roles.includes(role)) {
      router.replace("/");
    }
  }, [isLoading, isAuthenticated, role, roles, router, redirectTo]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--background)]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={28} className="animate-spin text-[var(--primary)]" />
          <span className="text-sm text-[var(--muted-foreground)]">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;
  if (roles && roles.length > 0 && role && !roles.includes(role)) return null;

  return <>{children}</>;
}
