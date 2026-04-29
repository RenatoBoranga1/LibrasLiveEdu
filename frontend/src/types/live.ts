export type ClassSession = {
  id: number;
  title: string;
  subject_id: number | null;
  access_code: string;
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
