import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import { Mic, Square } from "lucide-react";

export function Recorder({ value, onChange }: { value: Blob | null; onChange: (b: Blob | null) => void }) {
    const [isRecording, setIsRecording] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<BlobPart[]>([]);

    useEffect(() => {
        if (!value) {
            setPreviewUrl(null);
            return;
        }
        const url = URL.createObjectURL(value);
        setPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [value]);

    const { t } = useLanguage();

    const start = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            chunksRef.current = [];
            recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
            };
            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, {
                    type: recorder.mimeType || "audio/webm",
                });
                onChange(blob);
                stream.getTracks().forEach((t) => t.stop());
            };
            recorder.start();
            mediaRecorderRef.current = recorder;
            setIsRecording(true);
        } catch {
            toast.error(t("editor.audio.permission_error"));
        }
    };

    const stop = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            mediaRecorderRef.current = null;
        }
    };

    return (
        <div className="space-y-4" data-testid="recorder-root">
            <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-3">
                    <Button
                        type="button"
                        onClick={isRecording ? stop : start}
                        className={cn(
                            "h-12 rounded-xl px-5 flex-1 sm:flex-none",
                            isRecording ? "bg-[hsl(var(--destructive))]" : "bg-[hsl(var(--accent))]",
                        )}
                        data-testid={isRecording ? "button-stop-recording" : "button-start-recording"}
                    >
                        {isRecording ? (
                            <>
                                <Square className="h-5 w-5 mr-2" />
                                {t("editor.stop")}
                            </>
                        ) : (
                            <>
                                <Mic className="h-5 w-5 mr-2" />
                                {t("editor.record")}
                            </>
                        )}
                    </Button>

                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => onChange(null)}
                        disabled={!value}
                        className="h-12 rounded-xl px-4"
                        data-testid="button-clear-audio"
                    >
                        {t("action.clear")}
                    </Button>
                </div>

                {!previewUrl && (
                    <div className="text-sm text-muted-foreground bg-muted/20 p-3 rounded-xl border border-border/50" data-testid="text-audio-help">
                        {t("editor.audio.help")}
                    </div>
                )}
            </div>

            {previewUrl && (
                <div className="rounded-xl border bg-card p-3 shadow-sm" data-testid="audio-preview">
                    <audio controls src={previewUrl} className="w-full h-10" data-testid="audio-element" />
                </div>
            )}
        </div>
    );
}
