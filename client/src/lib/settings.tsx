import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type TtsSettings = {
  rate: number;
  pitch: number;
  volume: number;
  /** Selected voice's voiceURI, or null for the platform default. */
  voiceURI: string | null;
};

export const DEFAULT_TTS: TtsSettings = {
  rate: 0.95,
  pitch: 1.0,
  volume: 1.0,
  voiceURI: null,
};

const STORAGE_KEY = "mamanvoice-tts";

function loadSettings(): TtsSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_TTS;
    const parsed = JSON.parse(raw);
    return {
      rate: clamp(Number(parsed.rate), 0.5, 2, DEFAULT_TTS.rate),
      pitch: clamp(Number(parsed.pitch), 0, 2, DEFAULT_TTS.pitch),
      volume: clamp(Number(parsed.volume), 0, 1, DEFAULT_TTS.volume),
      voiceURI: typeof parsed.voiceURI === "string" ? parsed.voiceURI : null,
    };
  } catch {
    return DEFAULT_TTS;
  }
}

function clamp(n: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

type SettingsContextType = {
  tts: TtsSettings;
  setTts: (patch: Partial<TtsSettings>) => void;
  resetTts: () => void;
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [tts, setTtsState] = useState<TtsSettings>(loadSettings);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tts));
  }, [tts]);

  const value = useMemo<SettingsContextType>(
    () => ({
      tts,
      setTts: (patch) => setTtsState((prev) => ({ ...prev, ...patch })),
      resetTts: () => setTtsState(DEFAULT_TTS),
    }),
    [tts],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within a SettingsProvider");
  return ctx;
}
