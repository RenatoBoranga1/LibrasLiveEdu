export type UserRole = "admin" | "curator" | "professor" | "student" | "guardian";

export type SignStatus = "approved" | "pending" | "review" | "rejected" | "missing" | "unavailable";

export type MediaType = "video" | "gif" | "animation" | "image" | "none";

export type Permission =
  | "curation:read"
  | "curation:write"
  | "imports:run"
  | "classes:manage"
  | "classes:join";

export type ApiErrorPayload = {
  code: string;
  message: string;
  field?: string;
  request_id?: string;
};

export type AsyncState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "empty" }
  | { status: "error"; message: string };
