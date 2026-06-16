import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useLiveQuery } from "dexie-react-hooks";
import { useLanguage } from "@/lib/i18n";
import {
  Settings,
  ShieldCheck,
  Volume2,
  Folder as FolderIcon,
  Download,
  Upload,
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { CardWizard } from "@/components/card-wizard";
import { ConfirmDialog, type ConfirmState } from "@/components/confirm-dialog";
import { SpeechSettings } from "@/components/speech-settings";
import { useObjectUrl } from "@/hooks/use-object-url";
import { useSettings } from "@/lib/settings";
import { speak } from "@/lib/speech";
import {
  addCard,
  countDescendants,
  deleteCardCascade,
  exportData,
  FolderNotEmptyError,
  getCard,
  importData,
  listChildren,
  moveCard,
  seedIfEmpty,
  updateCard,
} from "@/lib/db";
import type { CardRecord } from "@shared/aac";
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id, disabled: !isEditMode });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    position: "relative" as const,
  };

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
        isDragging && "opacity-50 ring-2 ring-primary ring-offset-2",
      )}
      data-testid={`card-${card.id}`}
      whileTap={!isEditMode ? { scale: 0.95 } : undefined}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      <button
        onClick={onOpen}
        className={cn(
          "w-full h-full",
          "p-2",
          "flex flex-col items-stretch",
          "transition-transform duration-150",
          "active:scale-[0.99]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-[28px]",
          isFolder
            ? "bg-[linear-gradient(135deg,hsl(var(--secondary))/0.20,transparent_55%)]"
            : "bg-[linear-gradient(135deg,hsl(var(--primary))/0.16,transparent_55%)]",
        )}
        aria-label={isFolder ? `${card.label} — ${t("editor.type.folder")}` : card.label}
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
              alt=""
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" data-testid="modal-settings">
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

          <SpeechSettings />

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

export default function BoardPage() {
  const [, params] = useRoute("/folder/:id");
  const folderId = params?.id ?? null;
  const [, setLocation] = useLocation();

  const [isEditMode, setIsEditMode] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CardRecord | null>(null);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  const { t, language } = useLanguage();
  const { tts } = useSettings();

  const toggleMode = useCallback(() => {
    setIsEditMode((v) => {
      const next = !v;
      toast.success(next ? t("mode.parent_unlocked") : t("mode.child_locked"));
      return next;
    });
  }, [t]);

  const longPress = useLongPress(toggleMode);
  const tripleTap = useTripleTap(toggleMode);

  const ordered = useLiveQuery(() => listChildren(folderId), [folderId]);

  const currentFolder = useLiveQuery(async () => {
    if (!folderId) return null;
    return await getCard(folderId);
  }, [folderId]);

  useEffect(() => {
    void seedIfEmpty();
  }, []);

  const handleOpen = async (card: CardRecord) => {
    if (isEditMode) return;

    // Play recorded audio if present, otherwise fall back to TTS.
    if (card.audio) {
      const url = URL.createObjectURL(card.audio);
      const audio = new Audio(url);
      audio.volume = 1;
      const cleanup = () => URL.revokeObjectURL(url);
      audio.addEventListener("ended", cleanup, { once: true });
      audio.addEventListener("error", cleanup, { once: true });
      audio.play().catch(cleanup);
    } else {
      speak(card.label, language, tts);
    }

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
    try {
      if (data.id) {
        await updateCard(data.id, {
          type: data.type,
          label: data.label,
          image: data.image,
          audio: data.audio,
        });
        toast.success(t("toast.updated"));
      } else {
        await addCard({
          parentId: data.parentId,
          type: data.type,
          label: data.label,
          image: data.image,
          audio: data.audio,
        });
        toast.success(t("toast.added"));
      }
      setEditorOpen(false);
    } catch (err) {
      if (err instanceof FolderNotEmptyError) {
        toast.error(t("toast.folder_not_empty"));
      } else {
        toast.error(t("toast.storage_error"));
      }
    }
  };

  const performDelete = async (id: string) => {
    try {
      await deleteCardCascade(id);
      toast.success(t("toast.deleted"));
    } catch {
      toast.error(t("toast.storage_error"));
    }
  };

  const requestDelete = async (card: CardRecord) => {
    if (card.type === "folder") {
      const count = await countDescendants(card.id);
      setConfirm({
        title: t("confirm.delete.folder.title"),
        description: count > 0 ? t("confirm.delete.folder.desc", { count }) : t("confirm.delete.desc"),
        destructive: true,
        onConfirm: () => void performDelete(card.id),
      });
    } else {
      setConfirm({
        title: t("confirm.delete.title"),
        description: t("confirm.delete.desc"),
        destructive: true,
        onConfirm: () => void performDelete(card.id),
      });
    }
  };

  const exportBackup = async () => {
    try {
      const payload = await exportData();
      const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "mamanvoice-backup.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(t("toast.backup_exported"));
    } catch {
      toast.error(t("toast.import_failed"));
    }
  };

  const importBackup = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text());
      const ok = await importData(parsed);
      if (!ok) {
        toast.error(t("toast.invalid_backup"));
        return;
      }
      toast.success(t("toast.backup_imported"));
      setSettingsOpen(false);
      // Live queries refresh automatically; return to root in case we were
      // inside a folder that no longer exists after the restore.
      setLocation("/");
    } catch {
      toast.error(t("toast.import_failed"));
    }
  };

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !ordered) return;
    await moveCard(ordered, String(active.id), String(over.id));
  };

  const headerTitle = useMemo(() => {
    if (!folderId) return t("app.title");
    return currentFolder?.label ?? t("editor.type.folder");
  }, [currentFolder, folderId, t]);

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

        {/* Persistent Back Button - Fixed Position */}
        {folderId ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => setLocation("/")}
            className="fixed top-3 left-3 z-[60] h-12 w-12 rounded-xl p-0 sm:h-14 sm:w-auto sm:px-4 sm:text-lg shadow-sm sm:top-4 sm:left-4"
            data-testid="button-back"
          >
            <ArrowLeft className="h-6 w-6" />
            <span className="sr-only sm:not-sr-only sm:ml-2">{t("action.back")}</span>
          </Button>
        ) : null}

        <motion.header
          initial={{ y: 0 }}
          animate={{ y: headerVisible ? 0 : -120 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          style={{
            position: headerVisible ? "relative" : "absolute",
            top: headerVisible ? undefined : 0,
            left: headerVisible ? undefined : 0,
            right: headerVisible ? undefined : 0,
            zIndex: headerVisible ? undefined : 40,
          }}
          className="mb-3 sm:mb-4 flex items-center justify-between gap-3"
          data-testid="header"
        >
          {/* Left: Title/Back */}
          <div className={cn("flex items-center gap-3 flex-1", folderId && "pl-16 sm:pl-24 transition-all")}>
            <div className="leading-tight">
              <div className="text-sm text-muted-foreground" data-testid="text-mode">
                {isEditMode ? t("mode.parent") : t("mode.child")}
              </div>
              <div className="font-serif text-3xl sm:text-4xl font-extrabold tracking-tight" data-testid="text-title">
                {headerTitle}
              </div>
            </div>
          </div>

          {/* Center: Hide header button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setHeaderVisible(false)}
            onTouchEnd={(e) => {
              e.preventDefault();
              setHeaderVisible(false);
            }}
            className="h-10 w-10 rounded-xl"
            aria-label="Hide header"
          >
            <ChevronUp className="h-5 w-5" />
          </Button>

          {/* Right: Controls */}
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
                  className="h-16 w-16 sm:w-20 rounded-2xl p-0"
                  data-testid="button-settings"
                >
                  <Settings className="h-7 w-7" />
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
                isEditMode ? "h-16 w-16 sm:w-20" : "h-14 w-14",
                "rounded-2xl",
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
                  isEditMode ? "h-7 w-7 text-[hsl(var(--accent))]" : "h-6 w-6 text-muted-foreground",
                )}
              />
            </button>
          </div>
        </motion.header>

        <main data-testid="main">
          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
            <SortableContext items={(ordered ?? []).map((c) => c.id)} strategy={rectSortingStrategy}>
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
                    onDelete={() => void requestDelete(c)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

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

        <CardWizard
          open={editorOpen}
          onOpenChange={setEditorOpen}
          initial={editingCard}
          parentId={folderId}
          onSave={saveCard}
          onDelete={() => {
            if (!editingCard) return;
            setEditorOpen(false);
            void requestDelete(editingCard);
          }}
        />

        <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
      </div>
    </motion.div>
  );
}
