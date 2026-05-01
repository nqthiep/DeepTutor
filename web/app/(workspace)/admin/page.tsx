"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  listUsers,
  createUser,
  updateUser,
  getUser,
  toggleUserActive,
  deleteUser,
} from "@/lib/auth-api";
import type { User } from "@/lib/auth-api";
import Modal from "@/components/common/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import SubjectAdminPanel from "@/components/subject/SubjectAdminPanel";
import {
  Loader2,
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  UserPlus,
  Check,
  X,
  Shield,
  BookOpen,
} from "lucide-react";

const ROLES = ["learner", "manager", "administrator"] as const;
const ROLE_FILTERS = ["all", "learner", "manager", "administrator"] as const;
const STATUS_FILTERS = ["all", "active", "inactive"] as const;

export default function AdminPage() {
  const { user: me, getAccessToken, isAdmin } = useAuth();
  const [adminTab, setAdminTab] = useState<"users" | "subjects">("users");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const params: {
        search?: string;
        role?: string;
        is_active?: boolean;
      } = {};
      if (search) params.search = search;
      if (roleFilter !== "all") params.role = roleFilter;
      if (statusFilter !== "all")
        params.is_active = statusFilter === "active";
      const data = await listUsers(token, params);
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getAccessToken, search, roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleToggleActive = async (u: User) => {
    const token = getAccessToken();
    if (!token) return;
    if (u.id === me?.id) {
      alert("You cannot disable your own account.");
      return;
    }
    if (u.is_active) {
      if (!window.confirm(`Deactivate user "${u.display_name || u.email}"?`))
        return;
    }
    setTogglingId(u.id);
    try {
      const updated = await toggleUserActive(u.id, token);
      setUsers((prev) =>
        prev.map((x) => (x.id === updated.id ? updated : x)),
      );
    } catch (err: any) {
      alert(err.message);
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (u: User) => {
    const token = getAccessToken();
    if (!token) return;
    if (u.id === me?.id) {
      alert("You cannot delete your own account.");
      return;
    }
    if (!window.confirm(`Deactivate user "${u.display_name || u.email}"? They will be unable to log in.`))
      return;
    setDeleteConfirmId(u.id);
    try {
      await deleteUser(u.id, token);
      setUsers((prev) =>
        prev.map((x) =>
          x.id === u.id ? { ...x, is_active: false } : x,
        ),
      );
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const openView = async (u: User) => {
    const token = getAccessToken();
    if (!token) return;
    try {
      const detail = await getUser(u.id, token);
      setSelectedUser(detail);
      setShowViewModal(true);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const openEdit = (u: User) => {
    setSelectedUser(u);
    setShowEditModal(true);
  };

  if (!isAdmin) {
    return (
      <div className="flex h-full items-center justify-center text-[var(--muted-foreground)]">
        Access denied
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-6 py-3">
        <div className="flex items-center gap-3">
          <Shield size={18} className="text-[var(--muted-foreground)]" />
          <div>
            <div className="text-sm font-semibold text-[var(--foreground)]">
              Admin
            </div>
            <div className="text-xs text-[var(--muted-foreground)]">
              Manage users and learning subjects
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto [scrollbar-gutter:stable]">
        <div className="mx-auto max-w-[960px] px-6 py-6">

        {/* Tabs */}
        <div className="mb-6 flex items-center gap-1 border-b border-[var(--border)]/50 pb-3">
          <button
            onClick={() => setAdminTab("users")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] transition-colors ${
              adminTab === "users"
                ? "bg-[var(--muted)] font-medium text-[var(--foreground)]"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            <Shield size={14} />
            Users
          </button>
          <button
            onClick={() => setAdminTab("subjects")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] transition-colors ${
              adminTab === "subjects"
                ? "bg-[var(--muted)] font-medium text-[var(--foreground)]"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            <BookOpen size={14} />
            Subjects
          </button>
        </div>

      {adminTab === "users" && (
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"
          />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] pl-9 pr-3 py-2 text-[13px] text-[var(--foreground)] outline-none transition-colors focus:border-[var(--foreground)]/25"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[13px] text-[var(--foreground)] outline-none"
        >
          {ROLE_FILTERS.map((r) => (
            <option key={r} value={r}>
              {r === "all" ? "All Roles" : r.charAt(0).toUpperCase() + r.slice(1)}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[13px] text-[var(--foreground)] outline-none"
        >
          {STATUS_FILTERS.map((s) => (
            <option key={s} value={s}>
              {s === "all" ? "All Status" : s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)]/50 px-3 py-1.5 text-[12px] font-medium text-[var(--muted-foreground)] transition-colors hover:border-[var(--border)] hover:text-[var(--foreground)]"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Add User
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2
            className="animate-spin text-[var(--muted-foreground)]"
            size={24}
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Users list */}
      {!loading && (
        <div className="space-y-2">
          {users.length === 0 ? (
            <div className="py-8 text-center text-[13px] text-[var(--muted-foreground)]">
              No users found
            </div>
          ) : (
            users.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between rounded-xl border border-[var(--border)] px-4 py-3 transition-colors hover:bg-[var(--muted)]/30"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--muted)] text-[13px] font-medium text-[var(--foreground)]">
                    {(u.display_name || u.email || "U").charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[14px] font-medium text-[var(--foreground)]">
                        {u.display_name || "\u2014"}
                      </span>
                      {u.id === me?.id && (
                        <span className="rounded-md bg-[var(--primary)]/10 px-1.5 py-0.5 text-[10px] font-medium text-[var(--primary)]">
                          You
                        </span>
                      )}
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        u.role === "administrator"
                          ? "bg-purple-500/10 text-purple-600"
                          : u.role === "manager"
                            ? "bg-blue-500/10 text-blue-600"
                            : "bg-gray-500/10 text-gray-600"
                      }`}>
                        {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                      </span>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        u.is_active
                          ? "bg-green-500/10 text-green-600"
                          : "bg-red-500/10 text-red-600"
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          u.is_active ? "bg-green-500" : "bg-red-500"
                        }`} />
                        {u.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="mt-0.5 truncate text-[13px] text-[var(--muted-foreground)]">
                      {u.email}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => openView(u)}
                    className="rounded-lg p-2 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                    title="View details"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => openEdit(u)}
                    className="rounded-lg p-2 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                    title="Edit user"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleToggleActive(u)}
                    disabled={togglingId === u.id}
                    className={`rounded-lg p-2 transition-colors ${
                      u.is_active
                        ? "text-green-600 hover:bg-green-500/10"
                        : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                    } disabled:opacity-40`}
                    title={u.is_active ? "Disable user" : "Enable user"}
                  >
                    {togglingId === u.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : u.is_active ? (
                      <ToggleRight className="h-3.5 w-3.5" />
                    ) : (
                      <ToggleLeft className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(u)}
                    disabled={deleteConfirmId === u.id}
                    className="rounded-lg p-2 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-red-500 disabled:opacity-40"
                    title="Delete user"
                  >
                    {deleteConfirmId === u.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
      </div>
      )}

      {adminTab === "subjects" && (
        <SubjectAdminPanel />
      )}

        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(newUser) => {
            setUsers((prev) => [newUser, ...prev]);
            setShowCreateModal(false);
          }}
          getAccessToken={getAccessToken}
        />
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <EditUserModal
          user={selectedUser}
          onClose={() => {
            setShowEditModal(false);
            setSelectedUser(null);
          }}
          onUpdated={(updated) => {
            setUsers((prev) =>
              prev.map((x) => (x.id === updated.id ? updated : x)),
            );
            setShowEditModal(false);
            setSelectedUser(null);
          }}
          getAccessToken={getAccessToken}
        />
      )}

      {/* View User Modal */}
      {showViewModal && selectedUser && (
        <ViewUserModal
          user={selectedUser}
          onClose={() => {
            setShowViewModal(false);
            setSelectedUser(null);
          }}
          me={me}
        />
      )}
      </div>
    );
  }

// ─── Create User Modal ─────────────────────────────────────────────────────

function CreateUserModal({
  onClose,
  onCreated,
  getAccessToken,
}: {
  onClose: () => void;
  onCreated: (u: User) => void;
  getAccessToken: () => string | null;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState("learner");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const token = getAccessToken();
    if (!token) return;
    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const u = await createUser(
        { email, password, display_name: displayName, role },
        token,
      );
      onCreated(u);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={submitting ? () => {} : onClose}
      title="Create User"
      titleIcon={<UserPlus size={16} />}
      width="md"
      closeOnBackdrop={!submitting}
      closeOnEscape={!submitting}
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md px-3 py-1.5 text-[12.5px] font-medium text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-40"
          >
            Cancel
          </button>
          <Button
            variant="primary"
            size="sm"
            icon={<Plus size={14} />}
            loading={submitting}
            onClick={() => void handleSubmit()}
          >
            Create
          </Button>
        </div>
      }
    >
      <div className="space-y-4 px-5 py-4">
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@example.com"
          disabled={submitting}
          autoFocus
        />
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Min. 8 characters"
          disabled={submitting}
          showPasswordToggle
        />
        <Input
          label="Display Name"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Optional"
          disabled={submitting}
        />
        <div>
          <label className="mb-1 block text-[13px] font-medium text-[var(--foreground)]">
            Role
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            disabled={submitting}
            className="w-full rounded-xl border border-[var(--border)]/30 bg-[var(--background)]/50 px-4 py-2.5 text-sm text-[var(--foreground)] outline-none transition-all hover:border-[var(--border)]/60 focus:border-[var(--primary)]/50 focus:ring-2 focus:ring-[var(--primary)]/10"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </option>
            ))}
          </select>
        </div>
        {error && (
          <div className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12px] text-red-600">
            <AlertCircle size={13} />
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Edit User Modal ───────────────────────────────────────────────────────

function EditUserModal({
  user,
  onClose,
  onUpdated,
  getAccessToken,
}: {
  user: User;
  onClose: () => void;
  onUpdated: (u: User) => void;
  getAccessToken: () => string | null;
}) {
  const [displayName, setDisplayName] = useState(user.display_name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState(user.role);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const token = getAccessToken();
    if (!token) return;
    setSubmitting(true);
    setError(null);
    try {
      const u = await updateUser(
        user.id,
        {
          display_name: displayName || undefined,
          email: email || undefined,
          role,
        },
        token,
      );
      onUpdated(u);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={submitting ? () => {} : onClose}
      title="Edit User"
      titleIcon={<Pencil size={16} />}
      width="md"
      closeOnBackdrop={!submitting}
      closeOnEscape={!submitting}
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md px-3 py-1.5 text-[12.5px] font-medium text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-40"
          >
            Cancel
          </button>
          <Button
            variant="primary"
            size="sm"
            icon={<Check size={14} />}
            loading={submitting}
            onClick={() => void handleSubmit()}
          >
            Save
          </Button>
        </div>
      }
    >
      <div className="space-y-4 px-5 py-4">
        <Input
          label="Display Name"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          disabled={submitting}
          autoFocus
        />
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={submitting}
        />
        <div>
          <label className="mb-1 block text-[13px] font-medium text-[var(--foreground)]">
            Role
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            disabled={submitting}
            className="w-full rounded-xl border border-[var(--border)]/30 bg-[var(--background)]/50 px-4 py-2.5 text-sm text-[var(--foreground)] outline-none transition-all hover:border-[var(--border)]/60 focus:border-[var(--primary)]/50 focus:ring-2 focus:ring-[var(--primary)]/10"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </option>
            ))}
          </select>
        </div>
        {error && (
          <div className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12px] text-red-600">
            <AlertCircle size={13} />
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── View User Modal ───────────────────────────────────────────────────────

function ViewUserModal({
  user,
  onClose,
  me,
}: {
  user: User;
  onClose: () => void;
  me: any;
}) {
  const rows = useMemo(
    () => [
      { label: "ID", value: user.id },
      { label: "Email", value: user.email },
      { label: "Display Name", value: user.display_name || "\u2014" },
      {
        label: "Role",
        value:
          user.role.charAt(0).toUpperCase() + user.role.slice(1),
      },
      {
        label: "Status",
        value: user.is_active ? "Active" : "Inactive",
      },
      {
        label: "Created",
        value: new Date(user.created_at * 1000).toLocaleString(),
      },
      {
        label: "Updated",
        value: new Date(user.updated_at * 1000).toLocaleString(),
      },
    ],
    [user],
  );

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="User Details"
      titleIcon={<Eye size={16} />}
      width="sm"
    >
      <div className="divide-y divide-[var(--border)]/50 px-5 py-4">
        {rows.map((r) => (
          <div key={r.label} className="flex items-start gap-4 py-2.5">
            <span className="w-28 shrink-0 text-[12px] font-medium text-[var(--muted-foreground)]">
              {r.label}
            </span>
            <span className="text-[13px] text-[var(--foreground)] break-all">
              {r.value}
              {r.label === "Email" && user.id === me?.id && (
                <span className="ml-2 rounded bg-[var(--primary)]/10 px-1.5 py-0.5 text-[11px] text-[var(--primary)]">
                  You
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
    </Modal>
  );
}
