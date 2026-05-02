"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  GraduationCap,
  Globe,
  Target,
  Sparkles,
  BookOpen,
  Compass,
  Clock,
  FileText,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Users,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { useAuth } from "@/context/AuthContext";
import {
  submitOnboarding,
  type OnboardingData,
} from "@/lib/auth-api";
import { writeStoredLanguage } from "@/context/app-shell-storage";
import { apiUrl } from "@/lib/api";

// ─── Types ──────────────────────────────────────────────────────────────────

interface TextStep {
  type: "text";
  key: keyof OnboardingData;
  icon: React.ReactNode;
  title: string;
  description: string;
  chipSource: "i18n" | "subjects";
}

interface LangStep {
  type: "language";
}

interface InfoStep {
  type: "info";
}

type WizardStep = LangStep | InfoStep | TextStep;

interface StepState {
  selected: Set<string>;
  custom: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const LANGUAGES = [
  { id: "en" as const, label: "English", native: "English", flag: "🇬🇧" },
  { id: "vi" as const, label: "Tiếng Việt", native: "Tiếng Việt", flag: "🇻🇳" },
  { id: "zh" as const, label: "中文", native: "中文", flag: "🇨🇳" },
];

const GRADES = [
  { value: "lớp 1", label: "Lớp 1 (Age 6-7)" },
  { value: "lớp 2", label: "Lớp 2 (Age 7-8)" },
  { value: "lớp 3", label: "Lớp 3 (Age 8-9)" },
  { value: "lớp 4", label: "Lớp 4 (Age 9-10)" },
  { value: "lớp 5", label: "Lớp 5 (Age 10-11)" },
  { value: "lớp 6", label: "Lớp 6 (Age 11-12)" },
  { value: "lớp 7", label: "Lớp 7 (Age 12-13)" },
  { value: "lớp 8", label: "Lớp 8 (Age 13-14)" },
  { value: "lớp 9", label: "Lớp 9 (Age 14-15)" },
  { value: "lớp 10", label: "Lớp 10 (Age 15-16)" },
  { value: "lớp 11", label: "Lớp 11 (Age 16-17)" },
  { value: "lớp 12", label: "Lớp 12 (Age 17-18)" },
];

const AGES = [
  "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18",
];

const STEP_OPTIONS: Partial<Record<keyof OnboardingData, string[]>> = {
  purpose: [
    "onboarding.options.purpose.0",
    "onboarding.options.purpose.1",
    "onboarding.options.purpose.2",
    "onboarding.options.purpose.3",
    "onboarding.options.purpose.4",
  ],
  expectations: [
    "onboarding.options.expectations.0",
    "onboarding.options.expectations.1",
    "onboarding.options.expectations.2",
    "onboarding.options.expectations.3",
    "onboarding.options.expectations.4",
    "onboarding.options.expectations.5",
  ],
  current_level: [
    "onboarding.options.current_level.0",
    "onboarding.options.current_level.1",
    "onboarding.options.current_level.2",
    "onboarding.options.current_level.3",
  ],
  learning_style: [
    "onboarding.options.learning_style.0",
    "onboarding.options.learning_style.1",
    "onboarding.options.learning_style.2",
    "onboarding.options.learning_style.3",
    "onboarding.options.learning_style.4",
    "onboarding.options.learning_style.5",
  ],
  time_commitment: [
    "onboarding.options.time_commitment.0",
    "onboarding.options.time_commitment.1",
    "onboarding.options.time_commitment.2",
    "onboarding.options.time_commitment.3",
    "onboarding.options.time_commitment.4",
    "onboarding.options.time_commitment.5",
  ],
};

function combineValue(selected: Set<string>, custom: string): string {
  const parts: string[] = [];
  if (selected.size > 0) parts.push([...selected].join(", "));
  if (custom.trim()) parts.push(custom.trim());
  return parts.join("\n");
}

function parseValue(raw: string): StepState {
  const selected = new Set<string>();
  let custom = "";
  if (!raw.trim()) return { selected, custom };

  const lines = raw.split("\n");
  const firstLine = lines[0].trim();
  const parts = firstLine.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length > 1 && parts.some((p) => p.length < 60)) {
    for (const p of parts) selected.add(p);
    custom = lines.slice(1).join("\n").trim();
  } else {
    custom = raw.trim();
  }
  return { selected, custom };
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated, isLoading: authLoading, getAccessToken, refreshUser } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState<OnboardingData>({
    language: "", age: "", grade: "",
    purpose: "", expectations: "", current_level: "",
    learning_style: "", topics_of_interest: "", time_commitment: "",
    background: "",
  });

  const [stepStates, setStepStates] = useState<Partial<Record<keyof OnboardingData, StepState>>>({});

  // ── Fetch subjects from Admin settings ──
  const [adminSubjects, setAdminSubjects] = useState<{ id: string; name: string }[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    fetch(apiUrl("/api/v1/subjects"), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        const subjects = (data.subjects ?? [])
          .filter((s: { enabled?: boolean }) => s.enabled !== false)
          .map((s: { id: string; name: string }) => ({ id: s.id, name: s.name }));
        setAdminSubjects(subjects);
      })
      .catch(() => {})
      .finally(() => setSubjectsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!subjectsLoading && adminSubjects.length > 0) {
      setStepStates((prev) => ({
        ...prev,
        topics_of_interest: parseValue(formData.topics_of_interest),
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectsLoading, adminSubjects]);

  const resolvedSubjectNames = useMemo(
    () =>
      adminSubjects.map(
        (s) => {
          const translated = t(`subject.${s.id}`);
          return translated !== `subject.${s.id}` ? translated : s.name;
        },
      ),
    [adminSubjects, t],
  );

  const steps: WizardStep[] = [
    { type: "language" },
    { type: "info" },
    { type: "text", key: "purpose", icon: <Target size={22} />,
      title: t("onboarding.purpose.title"), description: t("onboarding.purpose.desc"),
      chipSource: "i18n" },
    { type: "text", key: "expectations", icon: <Sparkles size={22} />,
      title: t("onboarding.expectations.title"), description: t("onboarding.expectations.desc"),
      chipSource: "i18n" },
    { type: "text", key: "current_level", icon: <BookOpen size={22} />,
      title: t("onboarding.current_level.title"), description: t("onboarding.current_level.desc"),
      chipSource: "i18n" },
    { type: "text", key: "learning_style", icon: <Compass size={22} />,
      title: t("onboarding.learning_style.title"), description: t("onboarding.learning_style.desc"),
      chipSource: "i18n" },
    { type: "text", key: "topics_of_interest", icon: <BookOpen size={22} />,
      title: t("onboarding.topics_of_interest.title"), description: t("onboarding.topics_of_interest.desc"),
      chipSource: "subjects" },
    { type: "text", key: "time_commitment", icon: <Clock size={22} />,
      title: t("onboarding.time_commitment.title"), description: t("onboarding.time_commitment.desc"),
      chipSource: "i18n" },
    { type: "text", key: "background", icon: <FileText size={22} />,
      title: t("onboarding.background.title"), description: t("onboarding.background.desc"),
      chipSource: "i18n" },
  ];

  const currentStep = steps[step];

  // Resolve i18n key options
  const resolvedOptions = useMemo(() => {
    const map: Partial<Record<keyof OnboardingData, string[]>> = {};
    for (const [key, keys] of Object.entries(STEP_OPTIONS)) {
      map[key as keyof OnboardingData] = keys.map((k) => t(k));
    }
    return map;
  }, [t]);

  // Auth guard
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) { router.replace("/login"); return; }
    if (user?.role !== "learner") { router.replace("/chat"); return; }
    if (user?.onboarding_completed) { router.replace("/my-learning"); }
  }, [authLoading, isAuthenticated, user, router]);

  const getStepState = (key: keyof OnboardingData): StepState =>
    stepStates[key] ?? { selected: new Set<string>(), custom: "" };

  const flushStep = (key: keyof OnboardingData) => {
    const s = getStepState(key);
    setFormData((prev) => ({ ...prev, [key]: combineValue(s.selected, s.custom) }));
  };

  const toggleChip = (key: keyof OnboardingData, option: string) => {
    setStepStates((prev) => {
      const cur = prev[key] ?? { selected: new Set<string>(), custom: "" };
      const next = new Set(cur.selected);
      if (next.has(option)) { next.delete(option); } else { next.add(option); }
      return { ...prev, [key]: { selected: next, custom: cur.custom } };
    });
  };

  const setCustomText = (key: keyof OnboardingData, text: string) => {
    setStepStates((prev) => {
      const cur = prev[key] ?? { selected: new Set<string>(), custom: "" };
      return { ...prev, [key]: { selected: cur.selected, custom: text } };
    });
  };

  const selectLanguage = (langId: "en" | "zh" | "vi") => {
    setFormData((prev) => ({ ...prev, language: langId }));
    i18n.changeLanguage(langId);
    writeStoredLanguage(langId);
  };

  const canProceedForStep = (): boolean => {
    if (currentStep.type === "language") return formData.language.length > 0;
    if (currentStep.type === "info") return Boolean(formData.grade);
    const s = getStepState(currentStep.key);
    if (currentStep.key === "background") return true;
    if (currentStep.key === "topics_of_interest") return true;
    return s.selected.size > 0 || s.custom.trim().length > 0;
  };

  // ── Navigation ──

  const goTo = useCallback(
    (target: number) => {
      if (currentStep.type === "info") {
        if (formData.grade) {
          const ages: Record<string, string> = {
            "lớp 1": "6", "lớp 2": "7", "lớp 3": "8", "lớp 4": "9", "lớp 5": "10",
            "lớp 6": "11", "lớp 7": "12", "lớp 8": "13", "lớp 9": "14",
            "lớp 10": "15", "lớp 11": "16", "lớp 12": "17",
          };
          setFormData((prev) => ({ ...prev, age: ages[prev.grade] || "" }));
        }
      } else if (currentStep.type === "text") {
        flushStep(currentStep.key);
      }
      setStep(target);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [step, currentStep, formData.grade],
  );

  const handleNext = () => { if (step < steps.length - 1) goTo(step + 1); };
  const handlePrev = () => { if (step > 0) goTo(step - 1); };

  const handleSubmit = async () => {
    if (currentStep.type === "text") flushStep(currentStep.key);

    const payload = { ...formData };
    if (currentStep.type === "text") {
      const s = getStepState(currentStep.key);
      payload[currentStep.key] = combineValue(s.selected, s.custom);
    }

    setSubmitting(true);
    setError("");
    const token = getAccessToken();
    if (!token) {
      setError(t("onboarding.error.not_authenticated"));
      setSubmitting(false);
      return;
    }
    try {
      await submitOnboarding(payload, token);
      if (formData.language) {
        fetch(apiUrl("/api/v1/settings/ui"), {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ language: formData.language }),
        }).catch(() => {});
      }
      await refreshUser();
      router.replace("/my-learning");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("onboarding.error.submit_failed"));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading ──
  if (authLoading || !isAuthenticated || user?.role !== "learner" || user?.onboarding_completed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="w-5 h-5 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isLastStep = step === steps.length - 1;
  const canProceed = canProceedForStep();

  // ── Render helpers ──

  const renderChipGrid = (key: keyof OnboardingData, options: string[]) => {
    const s = getStepState(key);
    return (
      <div className="flex flex-wrap gap-2 mb-4">
        {options.map((option) => {
          const checked = s.selected.has(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => toggleChip(key, option)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium border transition-all cursor-pointer ${
                checked
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)] shadow-sm"
                  : "bg-[var(--background)] text-[var(--foreground)] border-[var(--border)] hover:border-[var(--primary)]/50 hover:bg-[var(--primary)]/5"
              }`}
            >
              {checked && <CheckCircle2 size={14} />}
              {option}
            </button>
          );
        })}
      </div>
    );
  };

  const renderCustomInput = (key: keyof OnboardingData) => {
    const s = getStepState(key);
    return (
      <div className="relative">
        <textarea
          className="w-full min-h-[52px] rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]/30 resize-none transition-colors"
          placeholder={t("onboarding.custom.placeholder")}
          value={s.custom}
          onChange={(e) => setCustomText(key, e.target.value)}
          maxLength={1500}
          rows={2}
        />
        <p className="text-[11px] text-[var(--muted-foreground)] text-right mt-0.5">
          {s.custom.length}/1500
        </p>
      </div>
    );
  };

  // ── Render ──
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-4">
      <Card className="!max-w-[560px] flex flex-col max-h-[90vh]">
        <div className="flex flex-col items-center shrink-0">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[var(--primary)] flex items-center justify-center">
              <GraduationCap size={22} className="text-[var(--primary-foreground)]" />
            </div>
            <span className="text-xl font-bold tracking-tight text-[var(--foreground)]">
              DeepTutor
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--foreground)]">
            {t("onboarding.welcome")}
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1 text-center max-w-sm">
            {t("onboarding.subtitle")}
          </p>
        </div>

        <div className="flex gap-1.5 my-6 shrink-0">
          {steps.map((_, i) => (
            <div key={i}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                i <= step ? "bg-[var(--primary)]" : "bg-[var(--muted)]"
              }`}
            />
          ))}
        </div>

        {/* ═══ Step content ═══ */}
        <div className="flex-1 overflow-y-auto min-h-0 -mx-6 px-6 scrollbar-thin">
          {/* Language Step */}
          {currentStep.type === "language" ? (
            <div className="mb-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] shrink-0">
                  <Globe size={22} />
                </div>
                <div>
                  <h2 className="text-[15px] font-semibold text-[var(--foreground)]">
                    {t("onboarding.language.title")}
                  </h2>
                  <p className="text-[13px] text-[var(--muted-foreground)]">
                    {t("onboarding.language.desc")}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                {LANGUAGES.map((lang) => {
                  const selected = formData.language === lang.id;
                  return (
                    <button key={lang.id} onClick={() => selectLanguage(lang.id)}
                      className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all text-left ${
                        selected ? "border-[var(--primary)] bg-[var(--primary)]/5 shadow-sm"
                          : "border-[var(--border)] bg-[var(--background)] hover:border-[var(--primary)]/40"
                      }`}
                    >
                      <span className="text-2xl">{lang.flag}</span>
                      <div className="flex-1">
                        <p className={`text-sm font-semibold ${selected ? "text-[var(--primary)]" : "text-[var(--foreground)]"}`}>
                          {lang.native}
                        </p>
                        {lang.native !== lang.label && (
                          <p className="text-[12px] text-[var(--muted-foreground)]">{lang.label}</p>
                        )}
                      </div>
                      {selected && <CheckCircle2 size={20} className="text-[var(--primary)] shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : currentStep.type === "info" ? (
            /* ── Age & Grade Step ── */
            <div className="mb-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] shrink-0">
                  <Users size={22} />
                </div>
                <div>
                  <h2 className="text-[15px] font-semibold text-[var(--foreground)]">
                    {t("onboarding.info.title")}
                  </h2>
                  <p className="text-[13px] text-[var(--muted-foreground)]">
                    {t("onboarding.info.desc")}
                  </p>
                </div>
              </div>

              <label className="text-[13px] font-medium text-[var(--foreground)] mb-2 block">
                {t("onboarding.info.grade")}
              </label>
              <div className="flex flex-wrap gap-2 mb-5">
                {GRADES.map((g) => {
                  const selected = formData.grade === g.value;
                  return (
                    <button key={g.value} type="button" onClick={() => setFormData((p) => ({ ...p, grade: g.value }))}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium border transition-all cursor-pointer ${
                        selected
                          ? "bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)] shadow-sm"
                          : "bg-[var(--background)] text-[var(--foreground)] border-[var(--border)] hover:border-[var(--primary)]/50"
                      }`}
                    >
                      {selected && <CheckCircle2 size={14} />}
                      {g.label}
                    </button>
                  );
                })}
              </div>

              {formData.grade && (
                <div className="rounded-lg bg-[var(--primary)]/5 border border-[var(--primary)]/20 px-4 py-3">
                  <p className="text-[13px] text-[var(--muted-foreground)]">{t("onboarding.info.hint")}</p>
                </div>
              )}
            </div>
          ) : (
            /* ── Text Steps (chips + custom) ── */
            <div className="mb-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] shrink-0">
                  {(currentStep as TextStep).icon}
                </div>
                <div>
                  <h2 className="text-[15px] font-semibold text-[var(--foreground)]">
                    {(currentStep as TextStep).title}
                  </h2>
                  <p className="text-[13px] text-[var(--muted-foreground)]">
                    {(currentStep as TextStep).description}
                  </p>
                </div>
              </div>

              {(currentStep as TextStep).key === "background" ? (
                /* Background: textarea only (no chips — info already covered by grade + purpose) */
                <>
                  <p className="text-[12px] text-[var(--muted-foreground)] mb-2.5">
                    {t("onboarding.add_custom")}
                  </p>
                  <div className="relative">
                    <textarea
                      className="w-full min-h-[100px] rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]/30 resize-none transition-colors"
                      placeholder={t("onboarding.background.placeholder")}
                      value={getStepState((currentStep as TextStep).key).custom}
                      onChange={(e) => setCustomText((currentStep as TextStep).key, e.target.value)}
                      maxLength={1500}
                      rows={4}
                    />
                    <p className="text-[11px] text-[var(--muted-foreground)] text-right mt-0.5">
                      {getStepState((currentStep as TextStep).key).custom.length}/1500
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-[12px] text-[var(--muted-foreground)] mb-2.5">
                    {t("onboarding.select_options")}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {(() => {
                      const key = (currentStep as TextStep).key;
                      if ((currentStep as TextStep).chipSource === "subjects") {
                        if (subjectsLoading) {
                          return (
                            <p className="text-[13px] text-[var(--muted-foreground)] italic">
                              {t("onboarding.loading_subjects")}
                            </p>
                          );
                        }
                        const s = getStepState(key);
                        if (adminSubjects.length === 0) {
                          return (
                            <p className="text-[13px] text-[var(--muted-foreground)] italic">
                              {t("onboarding.no_subjects")}
                            </p>
                          );
                        }
                        return resolvedSubjectNames.map((name: string) => {
                          const checked = s.selected.has(name);
                          return (
                            <button key={name} type="button" onClick={() => toggleChip(key, name)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium border transition-all cursor-pointer ${
                                checked
                                  ? "bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)] shadow-sm"
                                  : "bg-[var(--background)] text-[var(--foreground)] border-[var(--border)] hover:border-[var(--primary)]/50 hover:bg-[var(--primary)]/5"
                              }`}
                            >
                              {checked && <CheckCircle2 size={14} />}
                              {name}
                            </button>
                          );
                        });
                      }
                      const options = resolvedOptions[key] ?? [];
                      return options.map((option) => {
                        const checked = getStepState(key).selected.has(option);
                        return (
                          <button key={option} type="button" onClick={() => toggleChip(key, option)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium border transition-all cursor-pointer ${
                              checked
                                ? "bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)] shadow-sm"
                                : "bg-[var(--background)] text-[var(--foreground)] border-[var(--border)] hover:border-[var(--primary)]/50 hover:bg-[var(--primary)]/5"
                            }`}
                          >
                            {checked && <CheckCircle2 size={14} />}
                            {option}
                          </button>
                        );
                      });
                    })()}
                  </div>

                  <p className="text-[12px] text-[var(--muted-foreground)] mb-1.5">
                    {t("onboarding.add_custom")}
                  </p>
                  {renderCustomInput((currentStep as TextStep).key)}
                </>
              )}
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-[var(--destructive)]/10 border border-[var(--destructive)]/20 px-4 py-2.5 text-sm text-[var(--destructive)] mb-4">
              {error}
            </div>
          )}
        </div>

        {/* ═══ Navigation ═══ */}
        <div className="shrink-0 pt-4">
          <div className="flex items-center justify-between">
            <button onClick={handlePrev} disabled={step === 0}
              className="inline-flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ArrowLeft size={16} /> {t("Previous")}
            </button>

            <span className="text-[12px] text-[var(--muted-foreground)]">
              {step + 1} / {steps.length}
            </span>

            {isLastStep ? (
              <Button onClick={handleSubmit} loading={submitting} icon={<CheckCircle2 size={18} />} size="md">
                {t("onboarding.complete")}
              </Button>
            ) : (
              <Button onClick={handleNext} disabled={!canProceed} icon={<ArrowRight size={18} />} size="md"
                variant={canProceed ? "primary" : "secondary"}
              >
                {t("Next")}
              </Button>
            )}
          </div>

          {!isLastStep && (
            <p className="text-center mt-3">
              <button onClick={handleSubmit}
                className="text-[12px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] underline underline-offset-2"
              >
                {t("onboarding.skip")}
              </button>
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
