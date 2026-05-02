import { apiFetch } from "./api";

export interface DashboardOverview {
  profile: {
    identity: string;
    learning_style: string;
    knowledge_level: string;
    preferences: string;
  };
  summary: {
    current_focus: string;
    accomplishments: string;
    open_questions: string;
  };
  activity: {
    total_sessions: number;
    total_messages: number;
    sessions_this_week: number;
    last_active: string;
    daily: Array<{
      label: string;
      date: string;
      sessions: number;
      messages: number;
    }>;
  };
  quiz: {
    total: number;
    correct: number;
    accuracy: number;
    by_difficulty: Record<string, { total: number; correct: number }>;
  };
  by_subject: Array<{
    id: string;
    sessions: number;
    quizzes: number;
    accuracy: number;
  }>;
  books: Array<{
    id: string;
    title: string;
    pages_visited: number;
    total_pages: number;
    quiz_score: number;
    total_quizzes: number;
    weak_chapters: string[];
  }>;
}

export async function fetchDashboardOverview(): Promise<DashboardOverview> {
  const res = await apiFetch("/api/v1/dashboard/overview");
  return (await res.json()) as DashboardOverview;
}
