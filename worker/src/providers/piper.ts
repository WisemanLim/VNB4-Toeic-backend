/**
 * Piper (rhasspy/piper) OSS TTS. License: MIT.
 * Assumes a piper HTTP wrapper running at PIPER_URL (e.g. wyoming/piper-http or a small flask wrapper).
 * Fallback for dev / cost-free TTS.
 */
import type { SynthRequest, SynthResult, TtsLocaleStr } from "./index";

const VOICE_BY_LOCALE: Record<TtsLocaleStr, string> = {
  "en-US": process.env.PIPER_VOICE_US ?? "en_US-amy-medium",
  "en-GB": process.env.PIPER_VOICE_GB ?? "en_GB-alan-low",
  "en-AU": process.env.PIPER_VOICE_AU ?? "en_GB-jenny_dioco-medium",
};

export async function synthesizePiper(req: SynthRequest): Promise<SynthResult> {
  const url = process.env.PIPER_URL ?? "http://piper:5000/synthesize";
  const voice = VOICE_BY_LOCALE[req.locale];
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: req.text, voice }),
  });
  if (!res.ok) throw new Error(`Piper TTS failed: ${res.status}`);
  const arr = new Uint8Array(await res.arrayBuffer());
  return { buffer: Buffer.from(arr), voiceId: voice };
}
