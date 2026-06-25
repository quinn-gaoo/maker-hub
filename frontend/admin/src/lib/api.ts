import type {
  AdminComment,
  AdminDashboardStats,
  AdminFeedback,
  AdminProject,
  AdminUser,
  AuthSessionResponse,
  PaginatedResponse,
  ProjectDetail,
} from "@/types";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "http://127.0.0.1:8000/api/v1";

async function request<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message ?? `Request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json() as Promise<T>;
}

export async function getSession() {
  return request<AuthSessionResponse>("/auth/session");
}

export async function postLogin(payload: { email: string; password: string }) {
  return request<AuthSessionResponse>("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function postLogout() {
  return request("/auth/logout", {
    method: "POST",
  });
}

export async function getAdminUsers(params?: { q?: string; pageSize?: number }) {
  const search = new URLSearchParams();
  search.set("page", "1");
  search.set("page_size", String(params?.pageSize ?? 20));
  if (params?.q) {
    search.set("q", params.q);
  }
  return request<PaginatedResponse<AdminUser>>(`/admin/users?${search.toString()}`);
}

export async function getAdminDashboard() {
  return request<AdminDashboardStats>("/admin/dashboard");
}

export async function getAdminProjects(params?: { q?: string; status?: string; pageSize?: number }) {
  const search = new URLSearchParams();
  search.set("page", "1");
  search.set("page_size", String(params?.pageSize ?? 20));
  if (params?.q) {
    search.set("q", params.q);
  }
  if (params?.status) {
    search.set("status", params.status);
  }
  return request<PaginatedResponse<AdminProject>>(`/admin/projects?${search.toString()}`);
}

export async function updateAdminProject(projectId: string, payload: { status: "published" | "hidden" | "deleted" }) {
  return request<AdminProject>(`/admin/projects/${projectId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function getAdminFeedback(params?: { status?: string; pageSize?: number }) {
  const search = new URLSearchParams();
  search.set("page", "1");
  search.set("page_size", String(params?.pageSize ?? 20));
  if (params?.status) {
    search.set("status", params.status);
  }
  return request<PaginatedResponse<AdminFeedback>>(`/admin/feedback?${search.toString()}`);
}

export async function updateAdminFeedback(feedbackId: string, payload: { status: "new" | "reviewed" | "resolved" }) {
  return request<AdminFeedback>(`/admin/feedback/${feedbackId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function getAdminComments(params?: { q?: string; pageSize?: number }) {
  const search = new URLSearchParams();
  search.set("page", "1");
  search.set("page_size", String(params?.pageSize ?? 20));
  if (params?.q) {
    search.set("q", params.q);
  }
  return request<PaginatedResponse<AdminComment>>(`/admin/comments?${search.toString()}`);
}

export async function deleteAdminComment(commentId: string) {
  return request<void>(`/admin/comments/${commentId}`, {
    method: "DELETE",
  });
}

export async function updateAdminUser(
  userId: string,
  payload: { status: "active" | "banned"; role: "user" | "admin" },
) {
  return request<AdminUser>(`/admin/users/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function createOfficialProject(payload: {
  ownerUserId: string;
  title: string;
  description: string;
  projectUrl: string;
  githubUrl?: string | null;
  tags: string[];
  images: string[];
  isOfficial: boolean;
}) {
  return request<ProjectDetail>("/projects/admin/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export { request, API_BASE_URL };
