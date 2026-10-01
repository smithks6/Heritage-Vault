// ─────────────────────────────────────────────
// Core domain types (mirrors Supabase schema)
// ─────────────────────────────────────────────

export type PersonTier = "member" | "light_contributor" | "remembered";
export type MemberRole = "admin" | "member";
export type RecordingMedium = "audio" | "video";
export type RequestStatus = "pending" | "fulfilled" | "expired" | "declined";
export type Privacy = "admin" | "family" | "exportable";
export type TranscriptionStatus = "pending" | "processing" | "done" | "failed";
export type TranscriptionProvider = "deepgram" | "openai" | "fake";

export interface Vault {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface Person {
  id: string;
  vault_id: string;
  given_name: string;
  family_name: string | null;
  birth_year: number | null;
  death_year: number | null;
  bio: string | null;
  photo_url: string | null;
  is_deceased: boolean;
  tier: PersonTier;
  created_at: string;
}

export interface VaultMember {
  id: string;
  vault_id: string;
  user_id: string;
  person_id: string | null;
  role: MemberRole;
  joined_at: string;
}

export interface FamilyUnit {
  id: string;
  vault_id: string;
  marriage_year: number | null;
  created_at: string;
}

export interface FamilyPartner {
  family_unit_id: string;
  person_id: string;
}

export interface FamilyChild {
  family_unit_id: string;
  person_id: string;
  adopted: boolean;
}

export interface RecordingRequest {
  id: string;
  vault_id: string;
  requester_id: string;
  subject_person_id: string;
  subject: string;
  medium: RecordingMedium;
  status: RequestStatus;
  expires_at: string | null;
  fulfilled_at: string | null;
  created_at: string;
}

export interface ContributorToken {
  id: string;
  token: string;
  person_id: string;
  vault_id: string;
  request_id: string | null;
  expires_at: string;
  used_count: number;
  revoked_at: string | null;
  created_at: string;
}

export interface MediaAsset {
  id: string;
  vault_id: string;
  person_id: string;
  request_id: string | null;
  storage_path: string;
  mime_type: string;
  duration_seconds: number | null;
  size_bytes: number | null;
  title: string | null;
  recorded_at: string | null;
  privacy: Privacy;
  transcription_status: TranscriptionStatus;
  created_at: string;
}

export interface WordTiming {
  word: string;
  start: number;
  end: number;
  confidence?: number;
  speaker?: string;
}

export interface Speaker {
  id: string;
  label: string;
}

export interface Transcript {
  id: string;
  media_asset_id: string;
  provider: TranscriptionProvider;
  full_text: string | null;
  word_timings: WordTiming[] | null;
  speakers: Speaker[] | null;
  created_at: string;
}

// ─────────────────────────────────────────────
// Enriched / joined types (for UI)
// ─────────────────────────────────────────────

export interface PersonWithRecordings extends Person {
  recordings: MediaAsset[];
}

export interface RecordingWithTranscript extends MediaAsset {
  transcript: Transcript | null;
  person: Person;
}

export interface RequestWithContext extends RecordingRequest {
  subject_person: Person;
  requester: VaultMember & { person: Person | null };
}

// ─────────────────────────────────────────────
// Family tree graph (for rendering)
// ─────────────────────────────────────────────

export interface FamilyNode {
  id: string;
  person: Person;
  recordings_count: number;
}

export interface FamilyEdge {
  type: "partner" | "child";
  family_unit_id: string;
  from_id: string;
  to_id: string;
  adopted?: boolean;
}

export interface FamilyGraph {
  nodes: FamilyNode[];
  units: Array<{
    id: string;
    marriage_year: number | null;
    partners: string[];
    children: string[];
  }>;
}

// ─────────────────────────────────────────────
// Contributor session (stored in cookie)
// ─────────────────────────────────────────────

export interface ContributorSession {
  token_id: string;
  person_id: string;
  vault_id: string;
  request_id: string | null;
  expires_at: string;
}

// ─────────────────────────────────────────────
// API response shapes
// ─────────────────────────────────────────────

export interface ApiError {
  error: string;
  code?: string;
}

export interface SignedUploadResponse {
  signed_url: string;
  path: string;
  asset_id: string;
}

export interface TranscriptionCallbackPayload {
  metadata?: { asset_id?: string };
  results?: {
    channels?: Array<{
      alternatives?: Array<{
        transcript?: string;
        words?: Array<{
          word: string;
          start: number;
          end: number;
          confidence: number;
          speaker?: number;
        }>;
      }>;
    }>;
  };
}
