"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import {
  BookOpen,
  Brain,
  Clock,
  Flame,
  Loader2,
  Target,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { fetchDashboardOverview, type DashboardOverview } from "@/lib/dashboard-api";
import { useUnifiedChat } from "@/context/UnifiedChatContext";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

export default function LearnerDashboard() {
  const { t } = useTranslation();
  const { state } = useUnifiedChat();
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const d = await fetchDashboardOverview();
      setData(d);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!state.isStreaming && data) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.isStreaming]);

  // ── Derived stats ──
  const strengths = useMemo(() => {
    const items: { label: string; accuracy: number }[] = [];
    for (const [diff, val] of Object.entries(data?.quiz.by_difficulty ?? {})) {
      if (val.total === 0) continue;
      const acc = Math.round((val.correct / val.total) * 100);
      items.push({ label: diff, accuracy: acc });
    }
    items.sort((a, b) => b.accuracy - a.accuracy);
    return items;
  }, [data]);

  const subjectAccuracy = useMemo(() => {
    return (data?.by_subject ?? []).filter((s) => s.quizzes > 0).sort((a, b) => b.accuracy - a.accuracy);
  }, [data]);

  if (loading && !data) {
    return (
      <div className="flex h-full items-center justify-center text-[var(--muted-foreground)]">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        {t("Loading...")}
      </div>
    );
  }

  if (!data) return null;

  const hasActivity = data.activity.total_sessions > 0 || data.quiz.total > 0 || data.books.length > 0;
  const hasProfile = Boolean(data.profile.identity || data.summary.current_focus);

  const activityChart = {
    labels: data.activity.daily.map((d) => d.label),
    datasets: [{
      label: t("Sessions"),
      data: data.activity.daily.map((d) => d.sessions),
      backgroundColor: "rgba(59, 130, 246, 0.6)",
      borderRadius: 4,
    }],
  };

  const quizChart = {
    labels: [t("Correct"), t("Incorrect")],
    datasets: [{
      data: [data.quiz.correct, data.quiz.total - data.quiz.correct],
      backgroundColor: ["rgba(34, 197, 94, 0.7)", "rgba(239, 68, 68, 0.5)"],
      borderWidth: 0,
    }],
  };

  const subjectData = data.by_subject.filter((s) => s.sessions > 0);
  const subjectColors = ["#3b82f6", "#ef4444", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4"];
  const subjectChart = {
    labels: subjectData.map((s) => s.id.charAt(0).toUpperCase() + s.id.slice(1)),
    datasets: [{
      label: t("Sessions"),
      data: subjectData.map((s) => s.sessions),
      backgroundColor: subjectColors.slice(0, subjectData.length),
      borderRadius: 4,
    }],
  };

  return (
    <div className="h-full overflow-y-auto [scrollbar-gutter:stable]">
      <div className="mx-auto max-w-[960px] px-6 py-8">

        {/* ── Header ── */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-[24px] font-semibold tracking-tight text-[var(--foreground)]">
              {t("My Learning")}
            </h1>
            <p className="mt-1 text-[13px] text-[var(--muted-foreground)]">
              {t("Track your progress, strengths, and learning journey")}
            </p>
          </div>
          <button onClick={load} className="rounded-lg border border-[var(--border)]/50 px-2.5 py-1.5 text-[12px] text-[var(--muted-foreground)] transition-colors hover:border-[var(--border)] hover:text-[var(--foreground)]">
            {t("Refresh")}
          </button>
        </div>

        {!hasActivity ? (
          /* ── Empty state ── */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Sparkles size={44} className="mb-4 text-[var(--muted-foreground)]/20" />
            <p className="text-[17px] font-medium text-[var(--foreground)]">
              {t("Your learning journey starts here!")}
            </p>
            <p className="mt-1.5 max-w-sm text-[13px] text-[var(--muted-foreground)]">
              {t("Chat with AI to learn something new, take quizzes to test yourself, or read books to explore topics in depth.")}
            </p>
            <Link
              href="/chat"
              className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-[var(--foreground)] px-4 py-2 text-[13px] font-medium text-[var(--background)] transition-opacity hover:opacity-80"
            >
              {t("Start Learning")}
              <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <>
            {/* ── Learning Goals & Profile ── */}
            <div className="mb-6 grid gap-4 sm:grid-cols-2">
              <Link
                href="/space/memory?tab=profile"
                className="group rounded-xl border border-[var(--border)] p-4 transition-colors hover:border-[var(--border)]/80 hover:bg-[var(--muted)]/30"
              >
                <div className="mb-2 flex items-center gap-2">
                  <Brain size={15} className="text-[var(--muted-foreground)]" />
                  <h3 className="text-[13px] font-semibold text-[var(--foreground)]">{t("Learning Goals")}</h3>
                  <ArrowRight size={12} className="ml-auto text-[var(--muted-foreground)]/40 opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                {data.profile.identity ? (
                  <div className="space-y-1.5">
                    <p className="text-[12px] leading-relaxed text-[var(--muted-foreground)]">
                      <span className="font-medium text-[var(--foreground)]">{t("Identity")}:</span> {data.profile.identity}
                    </p>
                    {data.profile.learning_style && data.profile.learning_style !== "Not specified yet" && (
                      <p className="text-[12px] leading-relaxed text-[var(--muted-foreground)]">
                        <span className="font-medium text-[var(--foreground)]">{t("onboarding.learning_style.title")}:</span> {data.profile.learning_style}
                      </p>
                    )}
                    {data.profile.knowledge_level && data.profile.knowledge_level !== "Not assessed yet" && (
                      <p className="text-[12px] leading-relaxed text-[var(--muted-foreground)]">
                        <span className="font-medium text-[var(--foreground)]">{t("Level")}:</span> {data.profile.knowledge_level}
                      </p>
                    )}
                    {data.profile.preferences && (
                      <p className="text-[12px] leading-relaxed text-[var(--muted-foreground)]">
                        <span className="font-medium text-[var(--foreground)]">{t("onboarding.preferences")}:</span> {data.profile.preferences}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-[12px] italic text-[var(--muted-foreground)]/60">
                    {t("Set your learning goals in Memory")}
                  </p>
                )}
                {data.summary.current_focus && (
                  <p className="mt-1 text-[12px] leading-relaxed text-[var(--muted-foreground)]">
                    <span className="font-medium text-[var(--foreground)]">{t("Focus")}:</span> {data.summary.current_focus}
                  </p>
                )}
              </Link>
              <div className="rounded-xl border border-[var(--border)] p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Target size={15} className="text-[var(--muted-foreground)]" />
                  <h3 className="text-[13px] font-semibold text-[var(--foreground)]">{t("Quick Stats")}</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <StatItem icon={TrendingUp} label={t("Sessions")} value={String(data.activity.total_sessions)} />
                  <StatItem icon={Clock} label={t("This Week")} value={String(data.activity.sessions_this_week)} />
                  <StatItem icon={Target} label={t("Accuracy")} value={data.quiz.total ? `${data.quiz.accuracy}%` : "—"} />
                  <StatItem icon={Flame} label={t("Messages")} value={String(data.activity.total_messages)} />
                </div>
              </div>
            </div>

            {/* ── Strengths & Weaknesses ── */}
            <div className="mb-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-[var(--border)] p-4">
                <h3 className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-[var(--foreground)]">
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  {t("Strengths & Weaknesses")}
                </h3>
                {strengths.length > 0 ? (
                  <div className="space-y-2">
                    {strengths.map((s) => (
                      <div key={s.label}>
                        <div className="mb-0.5 flex items-center justify-between text-[12px]">
                          <span className="text-[var(--muted-foreground)]">{s.label}</span>
                          <span className={s.accuracy >= 70 ? "text-emerald-600" : s.accuracy >= 40 ? "text-amber-600" : "text-red-500"}>
                            {s.accuracy}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--muted)]">
                          <div
                            className={`h-full rounded-full transition-all ${
                              s.accuracy >= 70 ? "bg-emerald-500" : s.accuracy >= 40 ? "bg-amber-500" : "bg-red-500"
                            }`}
                            style={{ width: `${s.accuracy}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[12px] italic text-[var(--muted-foreground)]/60">
                    {t("Take quizzes to see your strengths and weaknesses.")}
                  </p>
                )}
              </div>
              <div className="rounded-xl border border-[var(--border)] p-4">
                <h3 className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-[var(--foreground)]">
                  <BookOpen size={14} className="text-[var(--muted-foreground)]" />
                  {t("Knowledge by Subject")}
                </h3>
                {subjectAccuracy.length > 0 ? (
                  <div className="space-y-2">
                    {subjectAccuracy.map((s) => (
                      <Link
                        key={s.id}
                        href="/chat"
                        className="group flex items-center justify-between rounded-lg px-2 py-1.5 text-[12px] transition-colors hover:bg-[var(--muted)]/50"
                      >
                        <span className="text-[var(--foreground)]">
                          {s.id.charAt(0).toUpperCase() + s.id.slice(1)}
                        </span>
                        <span className="text-[var(--muted-foreground)] group-hover:text-[var(--foreground)]">
                          {s.accuracy}% &middot; {s.sessions} {t("sessions")} &middot; {s.quizzes} {t("quizzes")}
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-[12px] italic text-[var(--muted-foreground)]/60">
                    {t("Study different subjects to see your knowledge breakdown.")}
                  </p>
                )}
              </div>
            </div>

            {/* ── Activity Chart ── */}
            <div className="mb-6 rounded-xl border border-[var(--border)] p-5">
              <Link href="/chat" className="group flex items-center justify-between">
                <h3 className="mb-4 text-[14px] font-semibold text-[var(--foreground)]">
                  {t("Weekly Activity")}
                </h3>
                <ArrowRight size={13} className="text-[var(--muted-foreground)]/40 opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
              {data.activity.daily.some((d) => d.sessions > 0) ? (
                <div className="h-48">
                  <Bar data={activityChart} options={{
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } }, x: { ticks: {} } },
                  }} />
                </div>
              ) : (
                <p className="py-8 text-center text-[12px] italic text-[var(--muted-foreground)]/60">
                  {t("Start chatting to see your weekly activity.")}
                </p>
              )}
            </div>

            {/* ── Quiz + Subject Charts ── */}
            <div className="mb-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-[var(--border)] p-5">
                <Link href="/learner-notes" className="group flex items-center justify-between">
                  <h3 className="mb-3 text-[14px] font-semibold text-[var(--foreground)]">
                    {t("Quiz Accuracy")}
                  </h3>
                  <ArrowRight size={13} className="text-[var(--muted-foreground)]/40 opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
                {data.quiz.total > 0 ? (
                  <>
                    <div className="mx-auto h-44 w-44">
                      <Doughnut data={quizChart} options={{
                        responsive: true, maintainAspectRatio: false,
                        plugins: { legend: { position: "bottom" } },
                      }} />
                    </div>
                    <div className="mt-2 text-center text-[12px] text-[var(--muted-foreground)]">
                      {data.quiz.correct}/{data.quiz.total} {t("correct")} ({data.quiz.accuracy}%)
                    </div>
                  </>
                ) : (
                  <p className="py-8 text-center text-[12px] italic text-[var(--muted-foreground)]/60">
                    {t("Complete quizzes to see your accuracy.")}
                  </p>
                )}
              </div>
              {subjectData.length > 0 && (
                <div className="rounded-xl border border-[var(--border)] p-5">
                  <h3 className="mb-3 text-[14px] font-semibold text-[var(--foreground)]">
                    {t("By Subject")}
                  </h3>
                  <div className="h-44">
                    <Bar data={subjectChart} options={{
                      indexAxis: "y" as const, responsive: true, maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } }, y: { ticks: {} } },
                    }} />
                  </div>
                </div>
              )}
            </div>

            {/* ── Open Questions ── */}
            {data.summary.open_questions && (
              <div className="mt-6 rounded-xl border border-[var(--border)] p-4">
                <h3 className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-[var(--foreground)]">
                  <XCircle size={14} className="text-[var(--muted-foreground)]" />
                  {t("Open Questions")}
                </h3>
                <p className="text-[12px] leading-relaxed text-[var(--muted-foreground)]">
                  {data.summary.open_questions}
                </p>
              </div>
            )}

            {/* ── Books ── */}
            {data.books.length > 0 && (
              <div className="rounded-xl border border-[var(--border)] p-5">
                <Link href="/book" className="group mb-4 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-[14px] font-semibold text-[var(--foreground)]">
                    <BookOpen size={16} />
                    {t("Books")}
                  </h3>
                  <ArrowRight size={13} className="text-[var(--muted-foreground)]/40 opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
                <div className="space-y-4">
                  {data.books.map((book) => (
                    <Link
                      key={book.id}
                      href={`/book?book=${book.id}`}
                      className="group block rounded-lg border border-transparent px-3 py-2 transition-colors hover:border-[var(--border)]/50 hover:bg-[var(--muted)]/30"
                    >
                      <div className="mb-1 flex items-center justify-between text-[13px]">
                        <span className="font-medium text-[var(--foreground)] group-hover:text-[var(--primary)]">
                          {book.title}
                        </span>
                        <span className="text-[var(--muted-foreground)]">
                          {book.pages_visited}/{book.total_pages} {t("pages")}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--muted)]">
                        <div
                          className="h-full rounded-full bg-[var(--primary)] transition-all"
                          style={{ width: `${book.total_pages ? Math.round((book.pages_visited / book.total_pages) * 100) : 0}%` }}
                        />
                      </div>
                      {book.total_quizzes > 0 && (
                        <div className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                          {t("Quiz")}: {book.quiz_score}/{book.total_quizzes}
                          {book.weak_chapters.length > 0 && (
                            <span className="ml-2 text-amber-600">
                              · {t("Needs review")}: {book.weak_chapters.join(", ")}
                            </span>
                          )}
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* ── Open Questions (from SUMMARY) ── */}
            {data.summary.open_questions && (
              <div className="mt-6 rounded-xl border border-[var(--border)] p-4">
                <h3 className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-[var(--foreground)]">
                  <XCircle size={14} className="text-[var(--muted-foreground)]" />
                  {t("Open Questions")}
                </h3>
                <p className="text-[12px] leading-relaxed text-[var(--muted-foreground)]">
                  {data.summary.open_questions}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StatItem({ icon: Icon, label, value }: { icon: React.ComponentType<{ size: number; className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={13} className="text-[var(--muted-foreground)]" />
      <div>
        <div className="text-[15px] font-semibold text-[var(--foreground)]">{value}</div>
        <div className="text-[10px] text-[var(--muted-foreground)]">{label}</div>
      </div>
    </div>
  );
}

