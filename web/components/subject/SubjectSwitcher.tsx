"use client";

import { useCallback, useRef, useState } from "react";
import { useSubject, subjectIcon } from "@/context/SubjectContext";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";

export default function SubjectSwitcher() {
  const { t } = useTranslation();
  const { subjects, activeSubject, setActiveSubject } = useSubject();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleSelect = useCallback(
    (id: string) => {
      setActiveSubject(id);
      setOpen(false);
    },
    [setActiveSubject],
  );

  const handleToggle = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  if (!subjects.length) return null;

  const icon = activeSubject ? subjectIcon(activeSubject.icon) : "\uD83D\uDCDA";

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={handleToggle}
        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors ${
          activeSubject
            ? "text-[var(--foreground)] hover:bg-[var(--muted)]"
            : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        }`}
      >
        <span>{icon}</span>
        <span>{activeSubject ? activeSubject.name : t("Subject")}</span>
        <ChevronDown
          size={12}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-full z-40 mt-1 w-48 rounded-xl border border-[var(--border)] bg-[var(--card)] p-1.5 shadow-lg">
            {subjects.map((s) => (
              <button
                key={s.id}
                onClick={() => handleSelect(s.id)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors ${
                  activeSubject?.id === s.id
                    ? "bg-[var(--muted)] font-medium text-[var(--foreground)]"
                    : "text-[var(--muted-foreground)] hover:bg-[var(--muted)]/50 hover:text-[var(--foreground)]"
                }`}
              >
                <span>{subjectIcon(s.icon)}</span>
                <span>{s.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
