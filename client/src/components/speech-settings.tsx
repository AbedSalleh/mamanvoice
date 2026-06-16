import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Volume2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useSettings } from "@/lib/settings";
import { listVoices, speak, type VoiceOption } from "@/lib/speech";

const DEFAULT_VOICE = "__default__";

export function SpeechSettings() {
  const { t, language } = useLanguage();
  const { tts, setTts, resetTts } = useSettings();
  const [voices, setVoices] = useState<VoiceOption[]>([]);

  useEffect(() => {
    let active = true;
    const load = () => {
      void listVoices(language).then((v) => {
        if (active) setVoices(v);
      });
    };
    load();
    // Web voices populate asynchronously.
    window.speechSynthesis?.addEventListener?.("voiceschanged", load);
    return () => {
      active = false;
      window.speechSynthesis?.removeEventListener?.("voiceschanged", load);
    };
  }, [language]);

  return (
    <div className="rounded-2xl border bg-card p-4 space-y-4" data-testid="panel-speech">
      <div>
        <div className="font-semibold">{t("settings.speech.title")}</div>
        <div className="text-sm text-muted-foreground">{t("settings.speech.subtitle")}</div>
      </div>

      <SliderRow
        label={`${t("settings.speech.rate")}: ${tts.rate.toFixed(2)}×`}
        value={tts.rate}
        min={0.5}
        max={2}
        step={0.05}
        onChange={(rate) => setTts({ rate })}
      />
      <SliderRow
        label={`${t("settings.speech.pitch")}: ${tts.pitch.toFixed(2)}`}
        value={tts.pitch}
        min={0}
        max={2}
        step={0.05}
        onChange={(pitch) => setTts({ pitch })}
      />
      <SliderRow
        label={`${t("settings.speech.volume")}: ${Math.round(tts.volume * 100)}%`}
        value={tts.volume}
        min={0}
        max={1}
        step={0.05}
        onChange={(volume) => setTts({ volume })}
      />

      {voices.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-sm font-medium">{t("settings.speech.voice")}</div>
          <Select
            value={tts.voiceURI ?? DEFAULT_VOICE}
            onValueChange={(v) => setTts({ voiceURI: v === DEFAULT_VOICE ? null : v })}
          >
            <SelectTrigger data-testid="select-voice">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={DEFAULT_VOICE}>{t("settings.speech.voice.default")}</SelectItem>
              {voices.map((v) => (
                <SelectItem key={v.voiceURI} value={v.voiceURI}>
                  {v.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button
          type="button"
          variant="secondary"
          className="rounded-xl"
          onClick={() => speak(t("settings.speech.test_phrase"), language, tts)}
          data-testid="button-test-voice"
        >
          <Volume2 className="h-4 w-4" />
          {t("settings.speech.test")}
        </Button>
        <Button type="button" variant="ghost" className="rounded-xl" onClick={resetTts}>
          {t("settings.speech.reset")}
        </Button>
      </div>
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-sm font-medium">{label}</div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(vals) => onChange(vals[0])}
      />
    </div>
  );
}
