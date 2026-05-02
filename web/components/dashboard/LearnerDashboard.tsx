"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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

  // Auto-refresh when a session streaming completes
  useEffect(() => {
    if (!state.isStreaming && data) {
      void load();
    }
  }, [state.isStreaming]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading && !data) {
    return (
      <div className="flex h-full items-center justify-center text-[var(--muted-foreground)]">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        {t("Loading...")}
      </div>
    );
  }

  if (!data) return null;

  const activityChart = {
    labels: data.activity.daily.map((d) => d.label),
    datasets: [
      {
        label: t("Sessions"),
        data: data.activity.daily.map((d) => d.sessions),
        backgroundColor: "rgba(59, 130, 246, 0.6)",
        borderRadius: 4,
      },
    ],
  };

  const quizChart = {
    labels: [t("Correct"), t("Incorrect")],
    datasets: [
      {
        data: [data.quiz.correct, data.quiz.total - data.quiz.correct],
        backgroundColor: ["rgba(34, 197, 94, 0.7)", "rgba(239, 68, 68, 0.5)"],
        borderWidth: 0,
      },
    ],
  };

  const subjectData = data.by_subject.filter((s) => s.sessions > 0);
  const subjectChart = {
    labels: subjectData.map((s) => s.id.charAt(0).toUpperCase() + s.id.slice(1)),
    datasets: [
      {
        label: t("Sessions"),
        data: subjectData.map((s) => s.sessions),
        backgroundColor: ["rgba(59,130,246,0.6)", "rgba(239,68,68,0.6)", "rgba(139,92,246,0.6)", "rgba(236,72,153,0.6)", "rgba(245,158,11,0.6)"],
        borderRadius: 4,
      },
    ],
  };

  return (
    <div className="h-full overflow-y-auto [scrollbar-gutter:stable]">
      <div className="mx-auto max-w-[960px] px-6 py-8">
        {/* ── Header ── */}
        <div className="mb-6">
          <h1 className="text-[24px] font-semibold tracking-tight text-[var(--foreground)]">
            {t("My Learning Dashboard")}
          </h1>
          <p className="mt-1 text-[13px] text-[var(--muted-foreground)]">
            {t("Your learning journey at a glance")}
          </p>
          <button
            onClick={load}
            className="mt-2 rounded-lg border border-[var(--border)]/50 px-2.5 py-1 text-[11px] text-[var(--muted-foreground)] transition-colors hover:border-[var(--border)] hover:text-[var(--foreground)]"
          >
            {t("Refresh")}
          </button>
        </div>

        {/* ── Quick Stats ── */}
        <div className="mb-6 grid gap-4 sm:grid-cols-4">
          <StatCard icon={TrendingUp} label={t("Sessions")} value={String(data.activity.total_sessions)} />
          <StatCard icon={Clock} label={t("This Week")} value={String(data.activity.sessions_this_week)} />
          <StatCard icon={Target} label={t("Accuracy")} value={data.quiz.total ? `${data.quiz.accuracy}%` : "—"} />
          <StatCard icon={Flame} label={t("Messages")} value={String(data.activity.total_messages)} />
        </div>

        {/* ── Memory cards ── */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          {data.profile.identity && (
            <MemoryCard icon={Brain} title={t("Profile")} lines={[data.profile.identity, data.profile.knowledge_level, data.profile.learning_style].filter(Boolean)} />
          )}
          {data.summary.current_focus && (
            <MemoryCard icon={Target} title={t("Current Focus")} lines={[data.summary.current_focus, ...(data.summary.accomplishments ? [`${t("Accomplishments")}: ${data.summary.accomplishments}`] : [])]} />
          )}
        </div>

        {/* ── Activity Chart ── */}
        {data.activity.daily.some((d) => d.sessions > 0) && (
          <div className="mb-6 rounded-xl border border-[var(--border)] p-5">
            <h3 className="mb-4 text-[14px] font-semibold text-[var(--foreground)]">
              {t("Activity")}
            </h3>
            <div className="h-48">
              <Bar
                data={activityChart}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1, color: "var(--muted-foreground)" } },
                    x: { ticks: { color: "var(--muted-foreground)" } },
                  },
                }}
              />
            </div>
          </div>
        )}

        {/* ── Quiz + Subject ── */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          {data.quiz.total > 0 && (
            <div className="rounded-xl border border-[var(--border)] p-5">
              <h3 className="mb-3 text-[14px] font-semibold text-[var(--foreground)]">
                {t("Quiz Accuracy")}
              </h3>
              <div className="mx-auto h-48 w-48">
                <Doughnut
                  data={quizChart}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: "bottom" } },
                  }}
                />
              </div>
              <div className="mt-3 text-center text-[12px] text-[var(--muted-foreground)]">
                {data.quiz.correct}/{data.quiz.total} {t("correct")} ({data.quiz.accuracy}%)
              </div>
            </div>
          )}
          {subjectData.length > 0 && (
            <div className="rounded-xl border border-[var(--border)] p-5">
              <h3 className="mb-3 text-[14px] font-semibold text-[var(--foreground)]">
                {t("By Subject")}
              </h3>
              <div className="h-48">
                <Bar
                  data={subjectChart}
                  options={{
                    indexAxis: "y" as const,
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      x: { beginAtZero: true, ticks: { stepSize: 1, color: "var(--muted-foreground)" } },
                      y: { ticks: { color: "var(--muted-foreground)" } },
                    },
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Books ── */}
        {data.books.length > 0 && (
          <div className="mb-6 rounded-xl border border-[var(--border)] p-5">
            <h3 className="mb-4 flex items-center gap-2 text-[14px] font-semibold text-[var(--foreground)]">
              <BookOpen size={16} />
              {t("Books")}
            </h3>
            <div className="space-y-3">
              {data.books.map((book) => (
                <div key={book.id}>
                  <div className="mb-1 flex items-center justify-between text-[13px]">
                    <span className="font-medium text-[var(--foreground)]">{book.title}</span>
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
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Empty state ── */}
        {!data.activity.total_sessions && !data.quiz.total && data.books.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <TrendingUp size={40} className="mb-3 text-[var(--muted-foreground)]/30" />
            <p className="text-[15px] font-medium text-[var(--foreground)]">
              {t("Start learning to see your dashboard!")}
            </p>
            <p className="mt-1 text-[13px] text-[var(--muted-foreground)]">
              {t("Chat with AI, take quizzes, or read books to track your progress.")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size: number; className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] px-4 py-4">
      <div className="flex items-center gap-2">
        <Icon size={16} className="text-[var(--muted-foreground)]" />
        <span className="text-[12px] text-[var(--muted-foreground)]">{label}</span>
      </div>
      <div className="mt-1 text-[22px] font-semibold text-[var(--foreground)]">{value}</div>
    </div>
  );
}

function MemoryCard({
  icon: Icon,
  title,
  lines,
}: {
  icon: React.ComponentType<{ size: number; className?: string }>;
  title: string;
  lines: string[];
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] px-4 py-4">
      <div className="mb-2 flex items-center gap-2">
        <Icon size={15} className="text-[var(--muted-foreground)]" />
        <h3 className="text-[13px] font-semibold text-[var(--foreground)]">{title}</h3>
      </div>
      {lines.map((line, i) => (
        <p key={i} className="text-[12px] leading-relaxed text-[var(--muted-foreground)] [&:not(:last-child)]:mb-1">
          {line}
        </p>
      ))}
    </div>
  );
}
