/**
 * Azure Neural TTS adapter. License: microsoft-cognitiveservices-speech-sdk MIT.
 */
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import type { SynthRequest, SynthResult, TtsLocaleStr } from "./index";

const VOICE_BY_LOCALE: Record<TtsLocaleStr, string> = {
  "en-US": process.env.AZURE_VOICE_US ?? "en-US-EmmaNeural",
  "en-GB": process.env.AZURE_VOICE_GB ?? "en-GB-LibbyNeural",
  "en-AU": process.env.AZURE_VOICE_AU ?? "en-AU-NatashaNeural",
};

export async function synthesizeAzure(req: SynthRequest): Promise<SynthResult> {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;
  if (!key || !region) throw new Error("AZURE_SPEECH_KEY / AZURE_SPEECH_REGION missing");

  const config = sdk.SpeechConfig.fromSubscription(key, region);
  const voiceId = VOICE_BY_LOCALE[req.locale];
  config.speechSynthesisVoiceName = voiceId;
  config.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio24Khz96KBitRateMonoMp3;

  const synth = new sdk.SpeechSynthesizer(config, undefined);
  try {
    const buffer = await new Promise<Buffer>((resolve, reject) => {
      synth.speakTextAsync(
        req.text,
        (result) => {
          if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
            resolve(Buffer.from(result.audioData));
          } else {
            reject(new Error(`Azure TTS failed: ${result.errorDetails}`));
          }
        },
        (err) => reject(new Error(err)),
      );
    });
    return { buffer, voiceId };
  } finally {
    synth.close();
  }
}
