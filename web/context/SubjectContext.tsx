"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { listSubjects, type Subject } from "@/lib/subject-api";

const STORAGE_KEY = "deeptutor-subject";

interface SubjectContextValue {
  subjects: Subject[];
  activeSubject: Subject | null;
  setActiveSubject: (id: string | null) => void;
  loading: boolean;
  refresh: () => Promise<void>;
}

const SubjectContext = createContext<SubjectContextValue | null>(null);

function subjectIcon(code: string): string {
  const map: Record<string, string> = {
    calculator: "\uD83D\uDCD0",
    atom: "\uD83D\uDD2C",
    flask: "\uD83E\uDDEA",
    "book-open": "\uD83D\uDCD6",
    globe: "\uD83C\uDF10",
    brain: "\uD83E\uDDE0",
    pencil: "\u270F\uFE0F",
    microscope: "\uD83D\uDD2C",
    telescope: "\uD83D\uDD2D",
    music: "\uD83C\uDFB5",
    landmark: "\uD83C\uDFDB\uFE0F",
    map: "\uD83D\uDDFA\uFE0F",
    code: "\uD83D\uDCBB",
    dna: "\uD83E\uDDEC",
    scale: "\u2696\uFE0F",
  };
  return map[code] || "\uD83D\uDCDA";
}

export function SubjectProvider({ children }: { children: ReactNode }) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [activeSubject, setActiveSubjectState] = useState<Subject | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const list = await listSubjects();
      setSubjects(list);
      return list;
    } catch {
      return [] as Subject[];
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    refresh().then((list) => {
      const storedId = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      if (storedId) {
        const match = list.find((s) => s.id === storedId && s.enabled);
        if (match) setActiveSubjectState(match);
      }
      setLoading(false);
    });
  }, [refresh]);

  const setActiveSubject = useCallback((id: string | null) => {
    if (id === null) {
      setActiveSubjectState(null);
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    setSubjects((prev) => {
      const match = prev.find((s) => s.id === id);
      if (match) {
        setActiveSubjectState(match);
        localStorage.setItem(STORAGE_KEY, id);
      }
      return prev;
    });
  }, []);

  return (
    <SubjectContext.Provider value={{ subjects, activeSubject, setActiveSubject, loading, refresh }}>
      {children}
    </SubjectContext.Provider>
  );
}

export function useSubject(): SubjectContextValue {
  const ctx = useContext(SubjectContext);
  if (!ctx) throw new Error("useSubject must be used within SubjectProvider");
  return ctx;
}

export { subjectIcon };
