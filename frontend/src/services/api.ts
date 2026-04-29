import type { AdminStats, AuthResponse, AuthUser, ClassReview, ClassSession, SignCategory, SignRecord, Subject } from "@/types/live";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
export const WS_BASE = API_BASE.replace(/^http/, "ws");

export function getStoredAccessToken() {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem("libraslive.access_token");
}

export function getStoredRefreshToken() {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem("libraslive.refresh_token");
}

export function storeAuthTokens(response: AuthResponse) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem("libraslive.access_token", response.access_token);
  window.sessionStorage.setItem("libraslive.refresh_token", response.refresh_token);
  window.sessionStorage.setItem("libraslive.user", JSON.stringify(response.user));
}

export function clearAuthTokens() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem("libraslive.access_token");
  window.sessionStorage.removeItem("libraslive.refresh_token");
  window.sessionStorage.removeItem("libraslive.user");
  navigator.serviceWorker?.controller?.postMessage({ type: "CLEAR_PRIVATE_CACHE" });
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getStoredAccessToken();
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    throw new Error(`API ${response.status}: ${await response.text()}`);
  }
  return response.json() as Promise<T>;
}

export function listSubjects(): Promise<Subject[]> {
  return request<Subject[]>("/api/subjects");
}

export function listCategories(): Promise<SignCategory[]> {
  return request<SignCategory[]>("/api/categories");
}

export function createClass(payload: {
  title: string;
  subject_id?: number | null;
  max_participants?: number;
  allow_anonymous_students?: boolean;
  require_teacher_approval?: boolean;
}): Promise<ClassSession> {
  return request<ClassSession>("/api/classes", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getClassByAccessCode(accessCode: string): Promise<ClassSession> {
  return request<ClassSession>(`/api/classes/access/${encodeURIComponent(accessCode)}`);
}

export function joinClass(accessCode: string, token?: string | null): Promise<ClassSession> {
  const query = token ? `?token=${encodeURIComponent(token)}` : "";
  return request<ClassSession>(`/api/classes/access/${encodeURIComponent(accessCode)}/join${query}`, { method: "POST" });
}

export function sendDemoTick(classSessionId: number, step: number) {
  return request<{ line: string; events: Array<{ event: string; payload: Record<string, unknown> }> }>(
    `/api/classes/${classSessionId}/demo-tick?step=${step}`,
    { method: "POST" }
  );
}

export function sendTranscript(classSessionId: number, text: string, confidence = 0.96) {
  return request<Array<{ event: string; payload: Record<string, unknown> }>>(`/api/classes/${classSessionId}/transcript`, {
    method: "POST",
    body: JSON.stringify({ text, confidence }),
  });
}

export function pauseClass(classSessionId: number) {
  return request<{ status: string }>(`/api/classes/${classSessionId}/pause`, { method: "POST" });
}

export function finishClass(classSessionId: number) {
  return request<{ status: string; summary: string; keywords: string[] }>(`/api/classes/${classSessionId}/finish`, {
    method: "POST",
  });
}

export function createSummary(classSessionId: number) {
  return request<{ id: number; summary: string; keywords: string[] }>(`/api/classes/${classSessionId}/summary`, {
    method: "POST",
  });
}

export function getReviewByAccessCode(accessCode: string): Promise<ClassReview> {
  return request<ClassReview>(`/api/classes/access/${encodeURIComponent(accessCode)}/review`);
}

export function saveWord(payload: {
  sign_id?: number;
  word?: string;
  access_code?: string;
  class_session_id?: number;
  notes?: string;
}) {
  return request<{ id: number; word: string; status: string }>("/api/saved-words", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getAdminStats(): Promise<AdminStats> {
  return request<AdminStats>("/api/admin/stats");
}

export function listSigns(params: URLSearchParams): Promise<SignRecord[]> {
  const query = params.toString();
  return request<SignRecord[]>(`/api/signs${query ? `?${query}` : ""}`);
}

export function approveSign(signId: number): Promise<SignRecord> {
  return request<SignRecord>(`/api/signs/${signId}/approve`, { method: "POST" });
}

export function rejectSign(signId: number, reason: string): Promise<SignRecord> {
  return request<SignRecord>(`/api/signs/${signId}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export function listSignAudit(signId: number) {
  return request<Array<{ id: number; action: string; created_at: string; old_value?: unknown; new_value?: unknown }>>(
    `/api/signs/${signId}/audit`
  );
}

export function updateSign(signId: number, payload: Partial<SignRecord>): Promise<SignRecord> {
  return request<SignRecord>(`/api/signs/${signId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function importSampleJson() {
  return request("/api/admin/import", {
    method: "POST",
    body: JSON.stringify({
      source_type: "json",
      source: "data/sample_libras_dictionary.json",
    }),
  });
}

export function importSampleCsv() {
  return request("/api/admin/import", {
    method: "POST",
    body: JSON.stringify({
      source_type: "csv",
      source: "data/sample_libras_dictionary.csv",
    }),
  });
}

export function importViaApi(providerName = "vlibras") {
  return request("/api/admin/import", {
    method: "POST",
    body: JSON.stringify({
      source_type: "api",
      source: providerName,
      provider_name: providerName,
    }),
  });
}

export function login(payload: { email: string; password: string }): Promise<AuthResponse> {
  return request<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function register(payload: {
  name: string;
  email: string;
  password: string;
  role: string;
  guardian_email?: string;
  school_name?: string;
  birth_date?: string;
  accept_terms?: boolean;
  accept_privacy?: boolean;
}): Promise<AuthResponse> {
  return request<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getMe(): Promise<AuthUser> {
  return request<AuthUser>("/api/auth/me");
}

export function logoutRequest() {
  return request<{ status: string }>("/api/auth/logout", { method: "POST" });
}

export function submitConsent(payload: {
  guardian_name?: string;
  guardian_email?: string;
  consent_type?: string;
  consent_text_version?: string;
}) {
  return request("/api/consent", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getPrivacyPolicy() {
  return request<{ notice: string; retention: unknown[] }>("/api/privacy/policy");
}

export function deleteMyData() {
  return request<{ status: string }>("/api/me/data", { method: "DELETE" });
}
