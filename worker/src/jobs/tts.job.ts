import { Locale, PrismaClient, TtsProvider } from "@prisma/client";
import { Logger } from "pino";
import { synthesize, uploadAudio, TtsProviderId, TtsLocaleStr } from "../providers";

export interface TtsJobData {
  wordId: string;
  locale: TtsLocaleStr;
  provider: TtsProviderId;
  requestedBy?: string;
}

const LOCALE_MAP: Record<TtsLocaleStr, Locale> = {
  "en-US": Locale.en_US,
  "en-GB": Locale.en_GB,
  "en-AU": Locale.en_AU,
};

const PROVIDER_MAP: Record<TtsProviderId, TtsProvider> = {
  azure: TtsProvider.azure,
  polly: TtsProvider.polly,
  google: TtsProvider.google,
  piper: TtsProvider.piper,
};

export async function handleTtsGenerate(prisma: PrismaClient, data: TtsJobData, logger: Logger) {
  const word = await prisma.word.findUnique({ where: { id: data.wordId } });
  if (!word) throw new Error(`word ${data.wordId} not found`);

  const text = word.exampleEn ? `${word.word}. ${word.exampleEn}` : word.word;

  const { buffer, voiceId, durationMs } = await synthesize({
    text,
    locale: data.locale,
    provider: data.provider,
  });

  const url = await uploadAudio({
    key: `audio/${data.locale}/${data.provider}/${word.id}.mp3`,
    body: buffer,
    contentType: "audio/mpeg",
  });

  const asset = await prisma.audioAsset.upsert({
    where: {
      wordId_locale_provider: {
        wordId: word.id,
        locale: LOCALE_MAP[data.locale],
        provider: PROVIDER_MAP[data.provider],
      },
    },
    update: { url, voiceId, durationMs },
    create: {
      wordId: word.id,
      locale: LOCALE_MAP[data.locale],
      provider: PROVIDER_MAP[data.provider],
      voiceId,
      url,
      durationMs,
    },
  });
  logger.info({ wordId: word.id, locale: data.locale, url }, "tts saved");
  return { assetId: asset.id, url };
}
