import { Capacitor } from "@capacitor/core";
import { TextToSpeech } from "@capacitor-community/text-to-speech";
import type { Language } from "@/lib/i18n";
import { DEFAULT_TTS, type TtsSettings } from "@/lib/settings";

export const TTS_LANG: Record<Language, string> = {
  en: "en-US",
  ms: "ms-MY",
};

export type VoiceOption = {
  voiceURI: string;
  name: string;
  lang: string;
};

/**
 * List voices available for the current platform & language. Returns an empty
 * list when the platform exposes none (the UI then hides voice selection).
 */
export async function listVoices(language: Language): Promise<VoiceOption[]> {
  const wanted = (TTS_LANG[language] ?? "en").slice(0, 2).toLowerCase();
  try {
    if (Capacitor.isNativePlatform()) {
      const { voices } = await TextToSpeech.getSupportedVoices();
      return voices
        .filter((v) => v.lang?.toLowerCase().startsWith(wanted))
        .map((v) => ({ voiceURI: v.voiceURI, name: v.name, lang: v.lang }));
    }
    const voices = window.speechSynthesis?.getVoices() ?? [];
    return voices
      .filter((v) => v.lang?.toLowerCase().startsWith(wanted))
      .map((v) => ({ voiceURI: v.voiceURI, name: v.name, lang: v.lang }));
  } catch {
    return [];
  }
}

export function speak(
  text: string,
  language: Language,
  settings: TtsSettings = DEFAULT_TTS,
) {
  if (!text) return;
  const lang = TTS_LANG[language] ?? "en-US";

  if (Capacitor.isNativePlatform()) {
    void (async () => {
      try {
        // The native plugin selects voices by index into getSupportedVoices().
        let voice: number | undefined;
        if (settings.voiceURI) {
          const { voices } = await TextToSpeech.getSupportedVoices();
          const idx = voices.findIndex((v) => v.voiceURI === settings.voiceURI);
          if (idx >= 0) voice = idx;
        }
        await TextToSpeech.speak({
          text,
          lang,
          rate: settings.rate,
          pitch: settings.pitch,
          volume: settings.volume,
          ...(voice !== undefined ? { voice } : {}),
        });
      } catch {
        // Fail silently — TTS is a best-effort fallback.
      }
    })();
    return;
  }

  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    utter.rate = settings.rate;
    utter.pitch = settings.pitch;
    utter.volume = settings.volume;
    if (settings.voiceURI) {
      const match = window.speechSynthesis
        .getVoices()
        .find((v) => v.voiceURI === settings.voiceURI);
      if (match) utter.voice = match;
    }
    window.speechSynthesis.speak(utter);
  } catch {
    // ignore
  }
}
