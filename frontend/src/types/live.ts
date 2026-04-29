export type ClassSession = {
  id: number;
  title: string;
  subject_id: number | null;
  access_code: string;
  join_token?: string | null;
  join_token_expires_at?: string | null;
  max_participants?: number;
  allow_anonymous_students?: boolean;
  require_teacher_approval?: boolean;
  status: "active" | "paused" | "finished";
  started_at?: string | null;
  finished_at?: string | null;
};

export type ClassReview = {
  classSession: ClassSession;
  transcript: Array<{ id: number; text: string; confidence?: number | null }>;
  keywords: string[];
  cards: SignCard[];
};

export type LiveTranscriptSegment = {
  id?: number;
  originalText?: string;
  text?: string;
  normalizedText?: string;
  confidence?: number | null;
};

export type SignCard = {
  id?: number;
  word: string;
  status: "approved" | "pending" | "review" | "rejected" | "missing" | string;
  title?: string;
  gloss?: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  sourceName?: string | null;
  license?: string | null;
  curation?: "approved" | "pending" | string;
};

export type LiveEvent = {
  event: string;
  payload: Record<string, unknown>;
};

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: "admin" | "professor" | "student" | "curator" | "guardian" | string;
  guardian_email?: string | null;
  school_name?: string | null;
};

export type AuthResponse = {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  user: AuthUser;
};

export type Subject = {
  id: number;
  name: string;
  description?: string | null;
};

export type SignCategory = {
  id: number;
  name: string;
  description?: string | null;
};

export type AdminStats = {
  total_signs: number;
  approved_signs: number;
  pending_signs: number;
  rejected_signs: number;
  review_signs: number;
  import_jobs: number;
};

export type SignRecord = {
  id: number;
  word: string;
  normalized_word: string;
  gloss?: string | null;
  category_id?: number | null;
  subject_id?: number | null;
  status: string;
  source_name?: string | null;
  license?: string | null;
  curator_notes?: string | null;
};
