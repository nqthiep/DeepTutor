"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSubject, subjectIcon } from "@/context/SubjectContext";
import {
  listSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  toggleSubject,
  SUBJECT_ICONS,
  type Subject,
} from "@/lib/subject-api";
import { useTranslation } from "react-i18next";
import { Loader2, Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";

const DEFAULT_COLORS = [
  "#3b82f6", "#ef4444", "#8b5cf6", "#ec4899", "#f59e0b",
  "#10b981", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
];

export default function SubjectAdminPanel() {
  const { t } = useTranslation();
  const { refresh: refreshSubjects } = useSubject();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ id: "", name: "", icon: "book-open", color: "#3b82f6", description: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listSubjects();
      setSubjects(list);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleCreate = useCallback(async () => {
    try {
      await createSubject({ ...form, enabled: true, sort_order: subjects.length + 1 });
      setShowForm(false);
      setForm({ id: "", name: "", icon: "book-open", color: "#3b82f6", description: "" });
      await load();
      await refreshSubjects();
    } catch (e) { alert(e instanceof Error ? e.message : "Failed"); }
  }, [form, load, refreshSubjects, subjects.length]);

  const handleUpdate = useCallback(async () => {
    if (!editing) return;
    try {
      await updateSubject(editing.id, editing);
      setEditing(null);
      await load();
      await refreshSubjects();
    } catch (e) { alert(e instanceof Error ? e.message : "Failed"); }
  }, [editing, load, refreshSubjects]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Delete this subject?")) return;
    try {
      await deleteSubject(id);
      await load();
      await refreshSubjects();
    } catch (e) { alert(e instanceof Error ? e.message : "Failed"); }
  }, [load, refreshSubjects]);

  const handleToggle = useCallback(async (id: string) => {
    try {
      await toggleSubject(id);
      await load();
      await refreshSubjects();
    } catch (e) { alert(e instanceof Error ? e.message : "Failed"); }
  }, [load, refreshSubjects]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-[var(--muted-foreground)]">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading subjects...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-semibold text-[var(--foreground)]">Subjects</h2>
          <p className="mt-0.5 text-[13px] text-[var(--muted-foreground)]">
            Manage learning subjects available to learners
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--foreground)] px-3 py-1.5 text-[12px] font-medium text-[var(--background)] transition-opacity hover:opacity-80"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Subject
        </button>
      </div>

      {/* ── Create form ── */}
      {showForm && (
        <div className="rounded-xl border border-[var(--border)] p-5">
          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[12px] text-[var(--muted-foreground)]">ID</label>
              <input
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-[13px] text-[var(--foreground)] outline-none"
                value={form.id}
                onChange={(e) => setForm((p) => ({ ...p, id: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") }))}
                placeholder="math"
              />
            </div>
            <div>
              <label className="mb-1 block text-[12px] text-[var(--muted-foreground)]">Name</label>
              <input
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-[13px] text-[var(--foreground)] outline-none"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Mathematics"
              />
            </div>
            <div>
              <label className="mb-1 block text-[12px] text-[var(--muted-foreground)]">Icon</label>
              <select
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-[13px] text-[var(--foreground)] outline-none"
                value={form.icon}
                onChange={(e) => setForm((p) => ({ ...p, icon: e.target.value }))}
              >
                {SUBJECT_ICONS.map((ic) => (
                  <option key={ic} value={ic}>{subjectIcon(ic)} {ic}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[12px] text-[var(--muted-foreground)]">Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  className="h-8 w-10 cursor-pointer rounded border border-[var(--border)] bg-transparent"
                  value={form.color}
                  onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))}
                />
                <span className="text-[12px] text-[var(--muted-foreground)]">{form.color}</span>
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-[12px] text-[var(--muted-foreground)]">Description</label>
              <input
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-[13px] text-[var(--foreground)] outline-none"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Numbers, equations, and problem solving"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCreate}
              className="rounded-lg bg-[var(--foreground)] px-3 py-1.5 text-[12px] font-medium text-[var(--background)] transition-opacity hover:opacity-80"
            >
              Create
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-[12px] text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Subject list ── */}
      <div className="space-y-2">
        {subjects.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between rounded-xl border border-[var(--border)] px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg text-base" style={{ backgroundColor: s.color + "20" }}>
                {subjectIcon(s.icon)}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-medium text-[var(--foreground)]">{s.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    s.enabled ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-gray-500/10 text-gray-500"
                  }`}>
                    {s.enabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
                <div className="text-[11px] text-[var(--muted-foreground)]">
                  {s.id} · {s.description || "—"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleToggle(s.id)}
                className="rounded-lg p-2 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                title={s.enabled ? "Disable" : "Enable"}
              >
                {s.enabled ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={() => setEditing(s)}
                className="rounded-lg p-2 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                title="Edit"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => handleDelete(s.id)}
                className="rounded-lg p-2 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-red-500"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
        {subjects.length === 0 && (
          <div className="py-8 text-center text-[13px] text-[var(--muted-foreground)]">
            No subjects yet. Add one to get started.
          </div>
        )}
      </div>

      {/* ── Edit modal ── */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl">
            <h3 className="mb-4 text-[16px] font-semibold text-[var(--foreground)]">Edit Subject</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-[12px] text-[var(--muted-foreground)]">Name</label>
                <input
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-[13px] text-[var(--foreground)] outline-none"
                  value={editing.name}
                  onChange={(e) => setEditing((p) => p ? { ...p, name: e.target.value } : null)}
                />
              </div>
              <div>
                <label className="mb-1 block text-[12px] text-[var(--muted-foreground)]">Icon</label>
                <select
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-[13px] text-[var(--foreground)] outline-none"
                  value={editing.icon}
                  onChange={(e) => setEditing((p) => p ? { ...p, icon: e.target.value } : null)}
                >
                  {SUBJECT_ICONS.map((ic) => (
                    <option key={ic} value={ic}>{subjectIcon(ic)} {ic}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[12px] text-[var(--muted-foreground)]">Color</label>
                <input
                  type="color"
                  className="h-8 w-full cursor-pointer rounded border border-[var(--border)] bg-transparent"
                  value={editing.color}
                  onChange={(e) => setEditing((p) => p ? { ...p, color: e.target.value } : null)}
                />
              </div>
              <div>
                <label className="mb-1 block text-[12px] text-[var(--muted-foreground)]">Description</label>
                <input
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-[13px] text-[var(--foreground)] outline-none"
                  value={editing.description}
                  onChange={(e) => setEditing((p) => p ? { ...p, description: e.target.value } : null)}
                />
              </div>
            </div>
            <div className="mt-6 flex items-center gap-2">
              <button
                onClick={handleUpdate}
                className="rounded-lg bg-[var(--foreground)] px-3 py-1.5 text-[12px] font-medium text-[var(--background)] transition-opacity hover:opacity-80"
              >
                Save
              </button>
              <button
                onClick={() => setEditing(null)}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-[12px] text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
