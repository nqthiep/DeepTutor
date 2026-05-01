"use client";

import { useState } from "react";
import { ClipboardList, NotebookPen } from "lucide-react";
import { useTranslation } from "react-i18next";
import NotebooksSection from "@/components/space/NotebooksSection";
import QuestionBankSection from "@/components/space/QuestionBankSection";

type Tab = "notebooks" | "questions";

export default function LearnerNotesPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>("notebooks");

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-6 py-3">
        <div className="flex items-center gap-3">
          <NotebookPen size={18} className="text-[var(--muted-foreground)]" />
          <div>
            <div className="text-sm font-semibold text-[var(--foreground)]">
              {t("Notes")}
            </div>
            <div className="text-xs text-[var(--muted-foreground)]">
              {t("Your notebooks and quiz questions")}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-[var(--muted)] p-0.5">
          <button
            onClick={() => setActiveTab("notebooks")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${
              activeTab === "notebooks"
                ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            <NotebookPen size={12} />
            {t("Notebooks")}
          </button>
          <button
            onClick={() => setActiveTab("questions")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${
              activeTab === "questions"
                ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            <ClipboardList size={12} />
            {t("Questions")}
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto [scrollbar-gutter:stable]">
        <div className="mx-auto max-w-5xl px-8 py-8 pb-12">
          {activeTab === "notebooks" ? (
            <NotebooksSection />
          ) : (
            <QuestionBankSection />
          )}
        </div>
      </div>
    </div>
  );
}
