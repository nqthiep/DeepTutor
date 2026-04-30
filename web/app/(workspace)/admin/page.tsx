"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  listUsers,
  updateUserRole,
} from "@/lib/auth-api";
import { Loader2 } from "lucide-react";

const ROLES = ["learner", "manager", "administrator"] as const;

export default function AdminPage() {
  const { user: me, getAccessToken, isAdmin } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listUsers(token);
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    const token = getAccessToken();
    if (!token) return;
    try {
      const updated = await updateUserRole(userId, newRole, token);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: updated.role } : u)),
      );
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex h-full items-center justify-center text-[var(--muted-foreground)]">
        Access denied
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-2xl font-bold text-[var(--foreground)]">
        User Management
      </h1>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-[var(--muted-foreground)]" size={24} />
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="overflow-hidden rounded-lg border border-[var(--border)]">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-[var(--secondary)] text-[var(--muted-foreground)]">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-[var(--muted-foreground)]">
                    No users found
                  </td>
                </tr>
              )}
              {users.map((u) => (
                <tr key={u.id} className="border-t border-[var(--border)]/50 transition-colors hover:bg-[var(--secondary)]/50">
                  <td className="px-4 py-3 text-[var(--foreground)]">
                    {u.display_name || "—"}
                    {u.id === me?.id && (
                      <span className="ml-2 rounded bg-[var(--primary)]/10 px-1.5 py-0.5 text-[11px] text-[var(--primary)]">
                        You
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted-foreground)]">{u.email}</td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-[13px] text-[var(--foreground)] transition-colors focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r.charAt(0).toUpperCase() + r.slice(1)}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
