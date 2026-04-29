import type { AdminStats, ClassReview, ClassSession, SignCategory, SignRecord, Subject } from "@/types/live";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
export const WS_BASE = API_BASE.replace(/^http/, "ws");

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
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
  teacher_name?: string;
  teacher_email?: string;
}): Promise<ClassSession> {
  return request<ClassSession>("/api/classes", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getClassByAccessCode(accessCode: string): Promise<ClassSession> {
  return request<ClassSession>(`/api/classes/access/${encodeURIComponent(accessCode)}`);
}

export function joinClass(accessCode: string): Promise<ClassSession> {
  return request<ClassSession>(`/api/classes/access/${encodeURIComponent(accessCode)}/join`, { method: "POST" });
}

export function sendDemoTick(classSessionId: number, step: number) {
  return request<{ line: string; events: Array<{ event: string; payload: Record<string, unknown> }> }>(
    `/api/classes/${classSessionId}/demo-tick?step=${step}`,
    { method: "POST" }
  );
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
