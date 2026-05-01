"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import KnowledgePage from "@/components/knowledge/KnowledgePage";
import { useAuth } from "@/context/AuthContext";

function KnowledgeOrRedirect() {
  const { isLearner } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLearner) {
      router.replace("/learner-notes");
    }
  }, [isLearner, router]);

  if (isLearner) {
    return null;
  }

  return <KnowledgePage />;
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-[13px] text-[var(--muted-foreground)]">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      }
    >
      <KnowledgeOrRedirect />
    </Suspense>
  );
}
