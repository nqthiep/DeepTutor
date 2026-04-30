import { apiUrl } from "@/lib/api";

export interface User {
  id: string;
  email: string;
  display_name: string;
  role: string;
  is_active: boolean;
  created_at: number;
  updated_at: number;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
}

// ─── Token storage ──────────────────────────────────────────────────────────

const ACCESS_KEY = "deeptutor.access_token";
const REFRESH_KEY = "deeptutor.refresh_token";

export function getStoredAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_KEY);
}

export function getStoredRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function storeTokens(tokens: AuthTokens): void {
  localStorage.setItem(ACCESS_KEY, tokens.access_token);
  localStorage.setItem(REFRESH_KEY, tokens.refresh_token);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

// ─── API helpers ────────────────────────────────────────────────────────────

async function authFetch<T>(
  path: string,
  body: unknown,
  token?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(apiUrl(path), {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Request failed");
  }
  return res.json();
}

// ─── Auth endpoints ─────────────────────────────────────────────────────────

export async function register(
  email: string,
  password: string,
  display_name?: string,
): Promise<AuthResponse> {
  return authFetch<AuthResponse>("/api/v1/auth/register", {
    email,
    password,
    display_name,
  });
}

export async function login(
  email: string,
  password: string,
): Promise<AuthResponse> {
  return authFetch<AuthResponse>("/api/v1/auth/login", { email, password });
}

export async function refreshTokens(
  refreshToken: string,
): Promise<AuthTokens> {
  return authFetch<AuthTokens>("/api/v1/auth/refresh", {
    refresh_token: refreshToken,
  });
}

export async function logout(refreshToken: string): Promise<void> {
  await authFetch<{ message: string }>("/api/v1/auth/logout", {
    refresh_token: refreshToken,
  });
}

export async function forgotPassword(email: string): Promise<void> {
  await authFetch<{ message: string }>("/api/v1/auth/forgot-password", {
    email,
  });
}

export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<void> {
  await authFetch<{ message: string }>("/api/v1/auth/reset-password", {
    token,
    new_password: newPassword,
  });
}

export async function getMe(accessToken: string): Promise<User> {
  const res = await fetch(apiUrl("/api/v1/auth/me"), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error("Unauthorized");
  }
  return res.json();
}

export async function updateProfile(
  data: { display_name?: string },
  accessToken: string,
): Promise<User> {
  const res = await fetch(apiUrl("/api/v1/auth/me"), {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Request failed");
  }
  return res.json();
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
  accessToken: string,
): Promise<void> {
  await authFetch<{ message: string }>(
    "/api/v1/auth/me/password",
    { current_password: currentPassword, new_password: newPassword },
    accessToken,
  );
}

// ─── Admin endpoints ──────────────────────────────────────────────────

interface ListUsersParams {
  search?: string;
  role?: string;
  is_active?: boolean;
}

export async function listUsers(
  accessToken: string,
  params?: ListUsersParams,
): Promise<User[]> {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.role) query.set("role", params.role);
  if (params?.is_active !== undefined) query.set("is_active", String(params.is_active));
  const qs = query.toString();
  const url = apiUrl(`/api/v1/auth/users${qs ? `?${qs}` : ""}`);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Request failed");
  }
  return res.json();
}

export async function getUser(
  userId: string,
  accessToken: string,
): Promise<User> {
  const res = await fetch(apiUrl(`/api/v1/auth/users/${userId}`), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Request failed");
  }
  return res.json();
}

export async function createUser(
  data: { email: string; password: string; display_name?: string; role: string },
  accessToken: string,
): Promise<User> {
  const res = await fetch(apiUrl("/api/v1/auth/users"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Request failed");
  }
  return res.json();
}

export async function updateUser(
  userId: string,
  data: { display_name?: string; email?: string; role?: string },
  accessToken: string,
): Promise<User> {
  const res = await fetch(apiUrl(`/api/v1/auth/users/${userId}`), {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Request failed");
  }
  return res.json();
}

export async function deleteUser(
  userId: string,
  accessToken: string,
): Promise<void> {
  const res = await fetch(apiUrl(`/api/v1/auth/users/${userId}`), {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Request failed");
  }
}

export async function toggleUserActive(
  userId: string,
  accessToken: string,
): Promise<User> {
  const res = await fetch(apiUrl(`/api/v1/auth/users/${userId}/active`), {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Request failed");
  }
  return res.json();
}

export async function updateUserRole(
  userId: string,
  role: string,
  accessToken: string,
): Promise<User> {
  const res = await fetch(apiUrl(`/api/v1/auth/users/${userId}/role`), {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ role }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Request failed");
  }
  return res.json();
}
