// Cross-package types (api/worker/clients).
// Mirror Prisma enums so non-Prisma consumers (app/frontend) avoid Prisma dep.

export type PartNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type LocaleId = "en-US" | "en-GB" | "en-AU";
export type TtsProviderId = "azure" | "polly" | "google" | "piper";
export type SrsStateId = "new" | "learning" | "review" | "mastered";
export type RoleId = "user" | "editor" | "admin";

export interface WordDto {
  id: string;
  part: PartNumber;
  word: string;
  pos?: string | null;
  meaningKo: string;
  ipa?: string | null;
  pronKo?: string | null;
  exampleEn?: string | null;
  exampleKo?: string | null;
  topic: string[];
  frequencyTier: number;
  imageUrl?: string | null;
  synonyms: string[];
  distractors: string[];
  audio: AudioAssetDto[];
}

export interface AudioAssetDto {
  id: string;
  locale: LocaleId;
  provider: TtsProviderId;
  voiceId: string;
  url: string;
  durationMs?: number | null;
}

export interface ProgressDto {
  id: string;
  wordId: string;
  state: SrsStateId;
  intervalDays: number;
  easeFactor: number;
  dueAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; name?: string | null; role: RoleId };
}
