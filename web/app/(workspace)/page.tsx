"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

/**
 * Root page now redirects learners to /dashboard, others to /chat.
 * Handles backward compatibility for /?session=xxx URLs.
 * Waits for auth to resolve before redirecting.
 */
export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, isLearner } = useAuth();

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;

    if (isLearner) {
      router.replace("/my-learning");
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session");
    const capability = params.get("capability");
    const tools = params.getAll("tool");

    let target = sessionId ? `/chat/${sessionId}` : "/chat";

    const query: string[] = [];
    if (capability) query.push(`capability=${encodeURIComponent(capability)}`);
    tools.forEach((t) => query.push(`tool=${encodeURIComponent(t)}`));
    if (query.length) target += `?${query.join("&")}`;

    router.replace(target);
  }, [isLoading, isAuthenticated, isLearner, router]);

  return null;
}
