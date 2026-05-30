import { synthesizeAzure } from "./azure";
import { synthesizePiper } from "./piper";
import { uploadS3 } from "./storage";

export type TtsLocaleStr = "en-US" | "en-GB" | "en-AU";
export type TtsProviderId = "azure" | "polly" | "google" | "piper";

export interface SynthRequest {
  text: string;
  locale: TtsLocaleStr;
  provider: TtsProviderId;
}

export interface SynthResult {
  buffer: Buffer;
  voiceId: string;
  durationMs?: number;
}

export async function synthesize(req: SynthRequest): Promise<SynthResult> {
  switch (req.provider) {
    case "azure":
      return synthesizeAzure(req);
    case "piper":
      return synthesizePiper(req);
    case "polly":
    case "google":
      throw new Error(`provider ${req.provider} not yet implemented`);
  }
}

export async function uploadAudio(args: { key: string; body: Buffer; contentType: string }) {
  return uploadS3(args);
}
