import { apiFetch } from "./api";

export interface Subject {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  enabled: boolean;
  sort_order: number;
  system_prompt?: string;
}

export async function listSubjects(): Promise<Subject[]> {
  const res = await apiFetch("/api/v1/subjects");
  const data = (await res.json()) as { subjects: Subject[] };
  return data.subjects;
}

export async function createSubject(subject: Omit<Subject, "sort_order"> & { sort_order?: number }): Promise<Subject> {
  const res = await apiFetch("/api/v1/subjects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subject),
  });
  const data = (await res.json()) as { subject: Subject };
  return data.subject;
}

export async function updateSubject(id: string, updates: Partial<Subject>): Promise<Subject> {
  const res = await apiFetch(`/api/v1/subjects/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  const data = (await res.json()) as { subject: Subject };
  return data.subject;
}

export async function deleteSubject(id: string): Promise<void> {
  await apiFetch(`/api/v1/subjects/${id}`, { method: "DELETE" });
}

export async function toggleSubject(id: string): Promise<Subject> {
  const res = await apiFetch(`/api/v1/subjects/${id}/toggle`, { method: "PATCH" });
  const data = (await res.json()) as { subject: Subject };
  return data.subject;
}

export async function restoreDefaultPrompt(id: string): Promise<Subject> {
  const res = await apiFetch(`/api/v1/subjects/${id}/restore-prompt`, { method: "POST" });
  const data = (await res.json()) as { subject: Subject };
  return data.subject;
}

export const SUBJECT_ICONS = [
  "calculator",
  "atom",
  "flask",
  "book-open",
  "globe",
  "brain",
  "pencil",
  "microscope",
  "telescope",
  "music",
  "landmark",
  "map",
  "code",
  "dna",
  "scale",
] as const;
