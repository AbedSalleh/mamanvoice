import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useRoute } from "wouter";
import Dexie, { type Table } from "dexie";
import { useLiveQuery } from "dexie-react-hooks";
import { v4 as uuidv4 } from "uuid";
import { useLanguage } from "@/lib/i18n";
import {
  Settings,
  ShieldCheck,
  Volume2,
  Folder as FolderIcon,
  Download,
  Upload,
  Mic,
  Square,
  ArrowLeft,
  Search,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SymbolPicker } from "@/components/symbol-picker";
import { toast } from "sonner";

type CardType = "speak" | "folder";

type CardRecord = {
  id: string;
  parentId: string | null;
  type: CardType;
  label: string;
  image: Blob | null;
  audio: Blob | null;
  order: number;
};

class AACDexie extends Dexie {
  cards!: Table<CardRecord, string>;

  constructor() {
    super("aac-db");
    this.version(1).stores({
      cards: "id, parentId, type, order",
    });
  }
}

const db = new AACDexie();

function formatDateStamp(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}

async function blobToBase64(blob: Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = () => {
      const res = String(reader.result || "");
      const base64 = res.includes(",") ? res.split(",")[1] : res;
      resolve(base64);
    };
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(base64: string, mime = "application/octet-stream") {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return new Blob([bytes], { type: mime });
}

type BackupCard = Omit<CardRecord, "image" | "audio"> & {
  image: { base64: string; type: string } | null;
  audio: { base64: string; type: string } | null;
};

type BackupFile = {
  version: 1;
  exportedAt: string;
  cards: BackupCard[];
};

function useTripleTap(onTrigger: () => void) {
  const tapCount = useRef(0);
  const lastTapAt = useRef(0);

  return useCallback(() => {
    const now = Date.now();
    if (now - lastTapAt.current > 700) {
      tapCount.current = 0;
    }
    lastTapAt.current = now;
    tapCount.current += 1;
    if (tapCount.current >= 3) {
      tapCount.current = 0;
      onTrigger();
    }
  }, [onTrigger]);
}

function useLongPress(onTrigger: () => void, ms = 650) {
  const timer = useRef<number | null>(null);

  const start = useCallback(() => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      onTrigger();
    }, ms);
  }, [ms, onTrigger]);

  const clear = useCallback(() => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
  }, []);

  return { start, clear };
}

function useObjectUrl(blob: Blob | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob) {
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  return url;
}

function speakFallback(text: string) {
  if (!text) return;
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.95;
    utter.pitch = 1.0;
    utter.lang = "en-US";
    window.speechSynthesis.speak(utter);
  } catch {
    // ignore
  }
}

function AACCardButton({
  card,
  isEditMode,
  onOpen,
  onEdit,
  onDelete,
}: {
  card: CardRecord;
  isEditMode: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const imgUrl = useObjectUrl(card.image);

  const isFolder = card.type === "folder";

  const { t } = useLanguage();

  return (
    <motion.div
      className={cn(
        "group relative",
        "rounded-[28px] aac-card-shadow",
        "bg-card text-card-foreground",
        "border border-border",
        "overflow-hidden",
      )}
      data-testid={`card-${card.id}`}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      <button
        onClick={onOpen}
        className={cn(
          "w-full h-full",
          "p-2",
          "flex flex-col items-stretch",
          "transition-transform duration-150",
          "active:scale-[0.99]",
          isFolder
            ? "bg-[linear-gradient(135deg,hsl(var(--secondary))/0.20,transparent_55%)]"
            : "bg-[linear-gradient(135deg,hsl(var(--primary))/0.16,transparent_55%)]",
        )}
        data-testid={`button-open-${card.id}`}
      >
        <div
          className={cn(
            "rounded-[22px]",
            "bg-white/60 border border-black/5",
            "overflow-hidden",
            "grid place-items-center",
            "aspect-square",
            "relative",
          )}
          data-testid={`imgwrap-${card.id}`}
        >
          {imgUrl ? (
            <img
              src={imgUrl}
              alt={card.label}
              className="h-full w-full object-cover"
              loading="eager"
              decoding="async"
              data-testid={`img-card-${card.id}`}
            />
          ) : (
            <div className="aac-noise h-full w-full grid place-items-center">
              <div
                className={cn(
                  "h-14 w-14 rounded-2xl",
                  "grid place-items-center",
                  isFolder ? "bg-[hsl(var(--secondary))/0.22]" : "bg-[hsl(var(--primary))/0.18]",
                  "border border-black/5",
                )}
                data-testid={`iconwrap-${card.id}`}
              >
                {isFolder ? (
                  <FolderIcon className="h-8 w-8" aria-hidden="true" />
                ) : (
                  <Volume2 className="h-8 w-8" aria-hidden="true" />
                )}
              </div>
            </div>
          )}

          {/* Small icon indicator in top-right corner */}
          <div
            className={cn(
              "absolute top-2 right-2",
              "w-8 h-8 rounded-full",
              "bg-white/90 backdrop-blur",
              "border border-black/10",
              "grid place-items-center",
            )}
            data-testid={`badge-type-${card.id}`}
          >
            {isFolder ? (
              <FolderIcon className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Volume2 className="h-4 w-4" aria-hidden="true" />
            )}
          </div>

          {/* Label overlay on bottom of image */}
          <div
            className={cn(
              "absolute bottom-0 left-0 right-0",
              "bg-black/70 backdrop-blur-sm",
              "px-3 py-2",
              "text-center",
            )}
            data-testid={`text-label-${card.id}`}
          >
            <div
              className={cn(
                "font-serif font-extrabold",
                "tracking-tight",
                "text-white",
                "text-[18px] sm:text-[20px] md:text-[22px]",
                "leading-tight",
              )}
            >
              {card.label}
            </div>
          </div>
        </div>
      </button>


      {isEditMode ? (
        <div className="absolute top-3 right-3 flex gap-2" data-testid={`controls-${card.id}`}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onEdit();
            }}
            className={cn(
              "h-11 w-11 rounded-2xl",
              "bg-white/85 backdrop-blur",
              "border border-black/10",
              "grid place-items-center",
              "active:scale-[0.98] transition",
            )}
            aria-label={t("action.edit")}
            data-testid={`button-edit-${card.id}`}
          >
            <Pencil className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete();
            }}
            className={cn(
              "h-11 w-11 rounded-2xl",
              "bg-white/85 backdrop-blur",
              "border border-black/10",
              "grid place-items-center",
              "active:scale-[0.98] transition",
            )}
            aria-label={t("action.delete")}
            data-testid={`button-delete-${card.id}`}
          >
            <Trash2 className="h-5 w-5 text-[hsl(var(--destructive))]" />
          </button>
        </div>
      ) : null}
    </motion.div>
  );
}

function Recorder({ value, onChange }: { value: Blob | null; onChange: (b: Blob | null) => void }) {
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
    <div className="space-y-2" data-testid="recorder-root">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          onClick={isRecording ? stop : start}
          className={cn(
            "h-10 rounded-xl px-3",
            isRecording ? "bg-[hsl(var(--destructive))]" : "bg-[hsl(var(--accent))]",
          )}
          data-testid={isRecording ? "button-stop-recording" : "button-start-recording"}
        >
          {isRecording ? (
            <>
              <Square className="h-4 w-4" />
              {t("editor.stop")}
            </>
          ) : (
            <>
              <Mic className="h-4 w-4" />
              {t("editor.record")}
            </>
          )}
        </Button>

        <Button
          type="button"
          variant="secondary"
          onClick={() => onChange(null)}
          disabled={!value}
          className="h-10 rounded-xl px-3"
          data-testid="button-clear-audio"
        >
          {t("action.clear")}
        </Button>

        {!previewUrl && (
          <span className="text-xs text-muted-foreground flex-1 min-w-0" data-testid="text-audio-help">
            {t("editor.audio.help")}
          </span>
        )}
      </div>

      {previewUrl && (
        <div className="rounded-xl border bg-card p-2" data-testid="audio-preview">
          <audio controls src={previewUrl} className="w-full h-8" data-testid="audio-element" />
        </div>
      )}
    </div>
  );
}

function SettingsModal({
  open,
  onOpenChange,
  onExport,
  onImport,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onExport: () => void;
  onImport: (file: File) => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const { language, setLanguage, t } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-testid="modal-settings">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" data-testid="title-settings">
            <ShieldCheck className="h-5 w-5" />
            {t("settings.title")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">

          <div className="rounded-2xl border bg-card p-4">
            <div className="font-semibold mb-3">{t("settings.language")}</div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={language === "en" ? "default" : "outline"}
                onClick={() => setLanguage("en")}
                className="rounded-xl"
              >
                English
              </Button>
              <Button
                variant={language === "ms" ? "default" : "outline"}
                onClick={() => setLanguage("ms")}
                className="rounded-xl"
              >
                Bahasa Melayu
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-4" data-testid="panel-backup">
            <div className="font-semibold" data-testid="text-backup-title">
              {t("settings.backup.title")}
            </div>
            <div className="text-sm text-muted-foreground" data-testid="text-backup-subtitle">
              {t("settings.backup.subtitle")}
            </div>
            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <Button
                type="button"
                onClick={onExport}
                className="h-12 rounded-2xl"
                data-testid="button-export"
              >
                <Download className="h-5 w-5" />
                {t("action.export")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => fileRef.current?.click()}
                className="h-12 rounded-2xl"
                data-testid="button-import"
              >
                <Upload className="h-5 w-5" />
                {t("action.import")}
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onImport(f);
                  e.currentTarget.value = "";
                }}
                data-testid="input-import-file"
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="text-sm text-muted-foreground" data-testid="text-settings-help">
              {t("settings.tip")}
            </div>
            <div className="text-xs text-muted-foreground/50 text-center pt-2">
              {t("settings.attribution")}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CardEditorModal({
  open,
  onOpenChange,
  initial,
  parentId,
  onSave,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: CardRecord | null;
  parentId: string | null;
  onSave: (data: Omit<CardRecord, "id"> & { id?: string }) => void;
  onDelete: () => void;
}) {
  const { t } = useLanguage();

  const [label, setLabel] = useState("");
  const [type, setType] = useState<CardType>("speak");
  const [image, setImage] = useState<Blob | null>(null);
  const [audio, setAudio] = useState<Blob | null>(null);

  useEffect(() => {
    if (!open) return;
    setLabel(initial?.label ?? "");
    setType(initial?.type ?? "speak");
    setImage(initial?.image ?? null);
    setAudio(initial?.audio ?? null);
  }, [initial, open]);

  const imgUrl = useObjectUrl(image);

  const isEditing = Boolean(initial);

  const canSave = label.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      id: initial?.id,
      parentId,
      type,
      label: label.trim(),
      image,
      audio,
      order: initial?.order ?? Date.now(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col" data-testid="modal-card-editor">
        <DialogHeader>
          <DialogTitle data-testid="title-card-editor">
            {isEditing ? t("editor.edit.title") : t("editor.add.title")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 pr-2">
          {/* Row 1: Label + Type - same height aligned */}
          <div className="grid gap-3 sm:grid-cols-2 items-end">
            <div className="space-y-1">
              <Label htmlFor="label" data-testid="label-input">
                {t("editor.label")}
              </Label>
              <Input
                id="label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={t("editor.label.placeholder")}
                className="h-12 rounded-lg text-lg"
                data-testid="input-label"
              />
            </div>

            <div className="space-y-1">
              <div className="font-semibold text-sm" data-testid="text-type-title">
                {t("editor.type")}
              </div>
              <RadioGroup
                value={type}
                onValueChange={(v) => setType(v as CardType)}
                className="flex gap-2"
                data-testid="radio-type"
              >
                <label
                  className={cn(
                    "flex-1 rounded-xl border bg-card h-12",
                    "flex items-center justify-center gap-2",
                    "cursor-pointer",
                  )}
                  data-testid="option-speak"
                >
                  <div className="font-medium text-sm">{t("editor.type.speak")}</div>
                  <RadioGroupItem value="speak" data-testid="radio-speak" />
                </label>
                <label
                  className={cn(
                    "flex-1 rounded-xl border bg-card h-12",
                    "flex items-center justify-center gap-2",
                    "cursor-pointer",
                  )}
                  data-testid="option-folder"
                >
                  <div className="font-medium text-sm">{t("editor.type.folder")}</div>
                  <RadioGroupItem value="folder" data-testid="radio-folder" />
                </label>
              </RadioGroup>
            </div>
          </div>

          {/* Row 2: Audio only - full width */}
          <div className="space-y-1">
            <div className="font-semibold text-sm" data-testid="text-audio-title">
              {t("editor.audio")}
            </div>
            <div className="rounded-2xl border bg-card p-3">
              <Recorder value={audio} onChange={setAudio} />
            </div>
          </div>

          {/* Row 3: Image picker (left) + Preview (right) */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <div className="font-semibold text-sm" data-testid="text-image-title">
                {t("editor.image")}
              </div>
              <div className="rounded-2xl border bg-card p-3">
                <Tabs defaultValue="upload" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-3">
                    <TabsTrigger value="library">{t("editor.tabs.library")}</TabsTrigger>
                    <TabsTrigger value="upload">{t("editor.tabs.upload")}</TabsTrigger>
                  </TabsList>

                  <TabsContent value="upload" className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-10 rounded-xl flex-1 text-sm"
                        onClick={() => document.getElementById("image-input")?.click()}
                        data-testid="button-pick-image"
                      >
                        <Upload className="h-4 w-4 mr-1" />
                        {t("upload.choose_file")}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-10 rounded-xl px-2 text-sm"
                        disabled={!image}
                        onClick={() => setImage(null)}
                        data-testid="button-clear-image"
                      >
                        {t("action.clear")}
                      </Button>
                    </div>
                    <input
                      id="image-input"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) setImage(f);
                        e.currentTarget.value = "";
                      }}
                      data-testid="input-image"
                    />
                  </TabsContent>

                  <TabsContent value="library">
                    <SymbolPicker onSelect={setImage} />
                  </TabsContent>
                </Tabs>
              </div>
            </div>

            <div className="space-y-1">
              <div className="font-semibold text-sm">{t("upload.preview")}</div>
              <div className="rounded-2xl border bg-card p-2">
                {imgUrl ? (
                  <img
                    src={imgUrl}
                    alt={t("upload.alt")}
                    className="w-24 h-24 object-contain rounded-lg border bg-white mx-auto"
                    loading="eager"
                    decoding="async"
                    data-testid="img-preview"
                  />
                ) : (
                  <div
                    className="w-24 h-24 rounded-lg border bg-muted/30 flex items-center justify-center text-xs text-muted-foreground text-center mx-auto p-2"
                    data-testid="text-no-image"
                  >
                    {t("upload.no_image")}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          {isEditing ? (
            <Button
              type="button"
              variant="destructive"
              onClick={onDelete}
              onTouchEnd={(e) => {
                e.preventDefault();
                onDelete();
              }}
              className="h-12 rounded-2xl"
              data-testid="button-delete-card"
            >
              <Trash2 className="h-5 w-5" />
              {t("action.delete")}
            </Button>
          ) : (
            <div />
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-12 rounded-xl"
              data-testid="button-cancel"
            >
              {t("action.cancel")}
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              onTouchEnd={(e) => {
                e.preventDefault();
                handleSave();
              }}
              className="flex-1 h-12 rounded-xl"
              disabled={!label.trim()}
              data-testid="button-save"
            >
              {t("action.save")}
            </Button>
            {initial && (
              <Button
                type="button"
                variant="destructive"
                onClick={onDelete}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  onDelete();
                }}
                className="h-12 w-12 rounded-xl px-0"
                data-testid="button-delete"
              >
                <Trash2 className="h-5 w-5" />
                <span className="sr-only">{t("action.delete")}</span>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function BoardPage() {
  const [, params] = useRoute("/folder/:id");
  const folderId = params?.id ?? null;
  const [, setLocation] = useLocation();

  const [isEditMode, setIsEditMode] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CardRecord | null>(null);
  const [headerVisible, setHeaderVisible] = useState(true);

  const { t } = useLanguage();

  const toggleMode = useCallback(() => {
    setIsEditMode((v) => {
      const next = !v;
      toast.success(next ? t("mode.parent_unlocked") : t("mode.child_locked"));
      return next;
    });
  }, [t]);

  const longPress = useLongPress(toggleMode);
  const tripleTap = useTripleTap(toggleMode);

  const ordered = useLiveQuery(async () => {
    if (folderId === null) {
      const folderCards = await db.cards
        .where("type")
        .equals("folder")
        .filter((c) => c.parentId === null)
        .sortBy("order");
      const speak = await db.cards
        .where("type")
        .equals("speak")
        .filter((c) => c.parentId === null)
        .sortBy("order");
      return [...folderCards, ...speak];
    }

    const folderCards = await db.cards
      .where({ parentId: folderId, type: "folder" })
      .sortBy("order");
    const speak = await db.cards.where({ parentId: folderId, type: "speak" }).sortBy("order");
    return [...folderCards, ...speak];
  }, [folderId]);

  const currentFolder = useLiveQuery(async () => {
    if (!folderId) return null;
    return await db.cards.get(folderId);
  }, [folderId]);

  useEffect(() => {
    (async () => {
      const count = await db.cards.count();
      if (count > 0) return;
      const seed: CardRecord[] = [
        {
          id: uuidv4(),
          parentId: null,
          type: "speak",
          label: "Hi",
          image: null,
          audio: null,
          order: 1,
        },
        {
          id: uuidv4(),
          parentId: null,
          type: "speak",
          label: "More",
          image: null,
          audio: null,
          order: 2,
        },
        {
          id: uuidv4(),
          parentId: null,
          type: "speak",
          label: "Help",
          image: null,
          audio: null,
          order: 3,
        },
        {
          id: uuidv4(),
          parentId: null,
          type: "folder",
          label: "Food",
          image: null,
          audio: null,
          order: 4,
        },
      ];
      await db.cards.bulkAdd(seed);
    })();
  }, []);

  const handleOpen = async (card: CardRecord) => {
    if (isEditMode) return;

    // Play Audio or TTS (for both Folders and Cards)
    if (card.audio) {
      const url = URL.createObjectURL(card.audio);
      try {
        const audio = new Audio(url);
        audio.volume = 1;
        // We don't await here to prevent blocking navigation if audio fails or lags
        audio.play().catch(() => { });
      } finally {
        // Keep the URL alive long enough for playback to start
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }
    } else {
      speakFallback(card.label);
    }

    // Navigate if folder
    if (card.type === "folder") {
      setLocation(`/folder/${card.id}`);
    }
  };

  const openAdd = () => {
    setEditingCard(null);
    setEditorOpen(true);
  };

  const openEdit = (card: CardRecord) => {
    setEditingCard(card);
    setEditorOpen(true);
  };

  const saveCard = async (data: Omit<CardRecord, "id"> & { id?: string }) => {
    const isUpdate = Boolean(data.id);
    const id = data.id ?? uuidv4();

    const record: CardRecord = {
      id,
      parentId: data.parentId,
      type: data.type,
      label: data.label,
      image: data.image,
      audio: data.audio,
      order: data.order,
    };

    if (isUpdate) {
      await db.cards.put(record);
      toast.success(t("toast.updated"));
    } else {
      await db.cards.add(record);
      toast.success(t("toast.added"));
    }

    setEditorOpen(false);
  };

  const deleteCard = async (id: string) => {
    const card = await db.cards.get(id);
    if (!card) return;

    if (card.type === "folder") {
      const children = await db.cards.where("parentId").equals(id).toArray();
      if (children.length > 0) {
        toast.error(t("toast.folder_not_empty"));
        return;
      }
    }

    await db.cards.delete(id);
    toast.success(t("toast.deleted"));
  };

  const exportBackup = async () => {
    const all = await db.cards.toArray();
    const cardsForBackup: BackupCard[] = [];

    for (const c of all) {
      const image = c.image
        ? {
          base64: await blobToBase64(c.image),
          type: c.image.type || "application/octet-stream",
        }
        : null;
      const audio = c.audio
        ? {
          base64: await blobToBase64(c.audio),
          type: c.audio.type || "application/octet-stream",
        }
        : null;
      cardsForBackup.push({
        id: c.id,
        parentId: c.parentId,
        type: c.type,
        label: c.label,
        order: c.order,
        image,
        audio,
      });
    }

    const payload: BackupFile = {
      version: 1,
      exportedAt: new Date().toISOString(),
      cards: cardsForBackup,
    };

    const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aac-backup-${formatDateStamp(new Date())}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    toast.success(t("toast.backup_exported"));
  };

  const importBackup = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as BackupFile;

      if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.cards)) {
        toast.error(t("toast.invalid_backup"));
        return;
      }

      const nextCards: CardRecord[] = parsed.cards.map((c) => ({
        id: c.id,
        parentId: c.parentId ?? null,
        type: c.type,
        label: c.label,
        order: c.order,
        image: c.image ? base64ToBlob(c.image.base64, c.image.type) : null,
        audio: c.audio ? base64ToBlob(c.audio.base64, c.audio.type) : null,
      }));

      await db.transaction("rw", db.cards, async () => {
        await db.cards.clear();
        await db.cards.bulkAdd(nextCards);
      });

      toast.success(t("toast.backup_imported"));
      setSettingsOpen(false);
      window.location.reload();
    } catch {
      toast.error(t("toast.import_failed"));
    }
  };

  const headerTitle = useMemo(() => {
    if (!folderId) return t("app.title");
    return currentFolder?.label ?? t("editor.type.folder");
  }, [currentFolder, folderId, t]);
  const isRoot = !folderId;

  // Auto-hide header after 3 seconds
  useEffect(() => {
    setHeaderVisible(true); // Show header on folder change
    const timer = setTimeout(() => {
      setHeaderVisible(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [folderId]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2 }}
      className="min-h-screen bg-background p-3 sm:p-4"
    >
      <div className="mx-auto max-w-7xl">
        {/* Toggle button when header is hidden */}
        {!headerVisible && (
          <motion.button
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            type="button"
            onClick={() => setHeaderVisible(true)}
            onTouchEnd={(e) => {
              e.preventDefault();
              setHeaderVisible(true);
            }}
            className={cn(
              "fixed top-0 left-1/2 -translate-x-1/2 z-50",
              "bg-card border border-border rounded-b-2xl",
              "px-4 py-2",
              "aac-card-shadow",
              "active:scale-[0.98] transition",
            )}
            aria-label="Show header"
          >
            <ChevronDown className="h-5 w-5" />
          </motion.button>
        )}

        <motion.header
          initial={{ y: 0 }}
          animate={{ y: headerVisible ? 0 : -120 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          style={{
            position: headerVisible ? 'relative' : 'absolute',
            top: headerVisible ? undefined : 0,
            left: headerVisible ? undefined : 0,
            right: headerVisible ? undefined : 0,
            zIndex: headerVisible ? undefined : 40,
          }}
          className="mb-3 sm:mb-4 flex items-center justify-between gap-3"
          data-testid="header"
        >
          <div className="flex items-center gap-3">
            {folderId ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setLocation("/")}
                className="h-14 rounded-2xl px-4 text-lg"
                data-testid="button-back"
              >
                <ArrowLeft className="h-6 w-6" />
                {t("action.back")}
              </Button>
            ) : null}

            <div className="leading-tight">
              <div className="text-sm text-muted-foreground" data-testid="text-mode">
                {isEditMode ? t("mode.parent") : t("mode.child")}
              </div>
              <div className="font-serif text-3xl sm:text-4xl font-extrabold tracking-tight" data-testid="text-title">
                {headerTitle}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isEditMode ? (
              <>
                <span className="text-xs text-destructive font-medium hidden md:inline-block mr-3 text-right">
                  {t("warning.local")}
                </span>
                <span className="text-xs text-muted-foreground hidden md:inline-block mr-2" data-testid="text-toolbar-help">
                  {t("header.tip.parent")}
                </span>
                <Button
                  type="button"
                  onClick={openAdd}
                  className="h-14 rounded-2xl px-5 text-lg"
                  data-testid="button-add-card"
                >
                  <Plus className="h-6 w-6" />
                  {t("action.add")}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setSettingsOpen(true)}
                  className="h-14 w-14 rounded-2xl p-0"
                  data-testid="button-settings"
                >
                  <Settings className="h-6 w-6" />
                </Button>
              </>
            ) : (
              <span className="text-xs text-muted-foreground text-right hidden sm:inline-block mr-2" data-testid="text-header-child-help">
                {t("header.tip.child")}
              </span>
            )}

            <button
              type="button"
              onClick={tripleTap}
              onPointerDown={longPress.start}
              onPointerUp={longPress.clear}
              onPointerCancel={longPress.clear}
              className={cn(
                "h-14 w-14 rounded-2xl",
                "grid place-items-center",
                "border border-border bg-card",
                "aac-card-shadow",
                "active:scale-[0.98] transition",
              )}
              aria-label="Unlock"
              data-testid="button-unlock"
            >
              <ShieldCheck
                className={cn(
                  "h-6 w-6",
                  isEditMode ? "text-[hsl(var(--accent))]" : "text-muted-foreground",
                )}
              />
            </button>
          </div>
        </motion.header>




        <main data-testid="main">
          <div
            className={cn("grid gap-3", "grid-cols-2", "sm:grid-cols-3", "md:grid-cols-4", "lg:grid-cols-4", "xl:grid-cols-4")}
            data-testid="grid-cards"
          >
            {(ordered ?? []).map((c) => (
              <AACCardButton
                key={c.id}
                card={c}
                isEditMode={isEditMode}
                onOpen={() => handleOpen(c)}
                onEdit={() => openEdit(c)}
                onDelete={() => deleteCard(c.id)}
              />
            ))}
          </div>

          {(ordered ?? []).length === 0 ? (
            <div className="mt-10 text-center" data-testid="empty">
              <div className="text-2xl font-serif font-extrabold" data-testid="text-empty-title">
                {t("empty.title")}
              </div>
              <div className="mt-2 text-muted-foreground" data-testid="text-empty-subtitle">
                {t("empty.subtitle")}
              </div>
            </div>
          ) : null}
        </main>

        <SettingsModal
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          onExport={exportBackup}
          onImport={importBackup}
        />

        <CardEditorModal
          open={editorOpen}
          onOpenChange={setEditorOpen}
          initial={editingCard}
          parentId={folderId}
          onSave={saveCard}
          onDelete={async () => {
            if (!editingCard) return;
            await deleteCard(editingCard.id);
            setEditorOpen(false);
          }}
        />
      </div>
    </motion.div>
  );
}
