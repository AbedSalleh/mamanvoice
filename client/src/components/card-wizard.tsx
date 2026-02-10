import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SymbolPicker } from "@/components/symbol-picker";
import { Recorder } from "./audio-recorder";
import { useObjectUrl } from "@/hooks/use-object-url";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { ArrowLeft, ArrowRight, Upload, Trash2, Check, Music, Folder as FolderIcon } from "lucide-react";
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

// Wizard Steps
// 1. Image
// 2. Audio & Type
// 3. Label & Save

interface CardWizardProps {
    open: boolean;
    onOpenChange: (o: boolean) => void;
    initial: CardRecord | null;
    parentId: string | null;
    onSave: (data: Omit<CardRecord, "id"> & { id?: string }) => void;
    onDelete: () => void;
}

export function CardWizard({
    open,
    onOpenChange,
    initial,
    parentId,
    onSave,
    onDelete,
}: CardWizardProps) {
    const { t } = useLanguage();
    const [step, setStep] = useState(1);

    // Form State
    const [label, setLabel] = useState("");
    const [type, setType] = useState<CardType>("speak");
    const [image, setImage] = useState<Blob | null>(null);
    const [audio, setAudio] = useState<Blob | null>(null);

    // Reset or Initialize on Open
    useEffect(() => {
        if (!open) return;
        setStep(1);
        setLabel(initial?.label ?? "");
        setType(initial?.type ?? "speak");
        setImage(initial?.image ?? null);
        setAudio(initial?.audio ?? null);
    }, [initial, open]);

    const imgUrl = useObjectUrl(image);
    const isEditing = Boolean(initial);

    const handleNext = () => {
        if (step < 3) setStep(step + 1);
    };

    const handleBack = () => {
        if (step > 1) setStep(step - 1);
    };

    const handleSave = () => {
        if (!label.trim()) {
            toast.error(t("editor.label.placeholder")); // Minimal validation feedback
            return;
        }

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
            <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col h-[600px] p-0 gap-0 overflow-hidden" data-testid="wizard-root">
                {/* Header with Step Indicator */}
                <div className="p-6 pb-2">
                    <DialogHeader>
                        <DialogTitle className="text-2xl text-center mb-2">
                            {isEditing ? t("editor.edit.title") : t("editor.add.title")}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex justify-center gap-2 mt-2">
                        {[1, 2, 3].map((s) => (
                            <div
                                key={s}
                                className={cn(
                                    "h-2 rounded-full transition-all duration-300",
                                    step === s ? "w-8 bg-[hsl(var(--primary))]" : "w-2 bg-muted",
                                    s < step ? "bg-[hsl(var(--primary))/0.5]" : ""
                                )}
                            />
                        ))}
                    </div>
                </div>

                {/* Content Area - Scrollable */}
                <div className="flex-1 overflow-y-auto p-6 pt-4">

                    {/* STEP 1: IMAGE */}
                    {step === 1 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="text-center space-y-2">
                                <h3 className="font-semibold text-lg">{t("editor.image")}</h3>

                                <div className="mx-auto w-32 h-32 rounded-3xl border-2 border-border border-dashed flex items-center justify-center bg-muted/20 relative overflow-hidden group">
                                    {imgUrl ? (
                                        <>
                                            <img src={imgUrl} alt="Preview" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="destructive" size="sm" onClick={() => setImage(null)}>
                                                    {t("action.clear")}
                                                </Button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-xs text-muted-foreground text-center p-2">
                                            {t("upload.no_image")}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <Tabs defaultValue="library" className="w-full">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="library">{t("editor.tabs.library")}</TabsTrigger>
                                    <TabsTrigger value="upload">{t("editor.tabs.upload")}</TabsTrigger>
                                </TabsList>

                                <TabsContent value="library" className="mt-4 h-[240px]">
                                    <SymbolPicker onSelect={setImage} />
                                </TabsContent>

                                <TabsContent value="upload" className="mt-4">
                                    <div
                                        className="border-2 border-dashed border-muted-foreground/25 rounded-xl p-8 text-center hover:bg-muted/20 transition cursor-pointer"
                                        onClick={() => document.getElementById("wizard-upload")?.click()}
                                    >
                                        <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                                        <div className="text-sm font-medium">{t("upload.instructions")}</div>
                                        <div className="text-xs text-muted-foreground mt-1">{t("upload.choose_file")}</div>
                                    </div>
                                    <input
                                        id="wizard-upload"
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            const f = e.target.files?.[0];
                                            if (f) setImage(f);
                                        }}
                                    />
                                </TabsContent>
                            </Tabs>
                        </div>
                    )}

                    {/* STEP 2: AUDIO & TYPE */}
                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">

                            <div className="space-y-3">
                                <h3 className="font-semibold text-lg text-center">{t("editor.type")}</h3>
                                <RadioGroup
                                    value={type}
                                    onValueChange={(v) => setType(v as CardType)}
                                    className="grid grid-cols-2 gap-3"
                                >
                                    <label className={cn(
                                        "cursor-pointer rounded-2xl border-2 p-4 flex flex-col items-center gap-2 transition-all",
                                        type === "speak" ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))/0.05]" : "border-border hover:bg-muted/50"
                                    )}>
                                        <div className={cn("p-2 rounded-full", type === "speak" ? "bg-[hsl(var(--primary))/0.1]" : "bg-muted")}>
                                            <Music className="h-6 w-6" />
                                        </div>
                                        <span className="font-medium">{t("editor.type.speak")}</span>
                                        <RadioGroupItem value="speak" className="sr-only" />
                                    </label>

                                    <label className={cn(
                                        "cursor-pointer rounded-2xl border-2 p-4 flex flex-col items-center gap-2 transition-all",
                                        type === "folder" ? "border-[hsl(var(--secondary))] bg-[hsl(var(--secondary))/0.05]" : "border-border hover:bg-muted/50"
                                    )}>
                                        <div className={cn("p-2 rounded-full", type === "folder" ? "bg-[hsl(var(--secondary))/0.1]" : "bg-muted")}>
                                            <FolderIcon className="h-6 w-6" />
                                        </div>
                                        <span className="font-medium">{t("editor.type.folder")}</span>
                                        <RadioGroupItem value="folder" className="sr-only" />
                                    </label>
                                </RadioGroup>
                            </div>

                            <div className="space-y-3">
                                <h3 className="font-semibold text-lg text-center">{t("editor.audio")}</h3>
                                <div className="bg-card border rounded-2xl p-4 shadow-sm">
                                    <Recorder value={audio} onChange={setAudio} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: LABEL */}
                    {step === 3 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="text-center">
                                <h3 className="font-semibold text-lg mb-4">{t("editor.label")}</h3>

                                <div className="flex justify-center mb-6">
                                    <div className="w-40 h-40 rounded-[28px] aac-card-shadow border bg-card flex flex-col overflow-hidden relative">
                                        <div className="flex-1 bg-white/60 relative">
                                            {imgUrl ? (
                                                <img src={imgUrl} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-muted/20">
                                                    <span className="text-muted-foreground text-xs">{t("upload.no_image")}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="bg-black/80 backdrop-blur-sm p-2 text-center text-white font-serif font-bold text-lg min-h-[3rem] flex items-center justify-center">
                                            {label || "..."}
                                        </div>
                                        {type === 'folder' && <div className="absolute top-2 right-2 p-1 bg-white/90 rounded-full"><FolderIcon className="w-3 h-3" /></div>}
                                    </div>
                                </div>

                                <div className="space-y-2 text-left">
                                    <Label htmlFor="card-label">Label Name</Label>
                                    <Input
                                        id="card-label"
                                        value={label}
                                        onChange={(e) => setLabel(e.target.value)}
                                        placeholder={t("editor.label.placeholder")}
                                        className="h-14 text-lg rounded-xl"
                                        autoFocus
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <DialogFooter className="p-6 pt-2 flex-row gap-3 sm:justify-between border-t border-border/40">
                    {step === 1 ? (
                        <Button variant="ghost" type="button" onClick={() => onOpenChange(false)} className="h-12 rounded-xl text-muted-foreground">
                            {t("action.cancel")}
                        </Button>
                    ) : (
                        <Button variant="outline" type="button" onClick={handleBack} className="h-12 rounded-xl px-6">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            {t("action.back")}
                        </Button>
                    )}

                    {step < 3 ? (
                        <Button type="button" onClick={handleNext} className="h-12 rounded-xl px-8 ml-auto">
                            {t("action.next")}
                            <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                    ) : (
                        <Button type="button" onClick={handleSave} disabled={!label.trim()} className="h-12 rounded-xl px-8 ml-auto bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))/0.9]">
                            {t("action.save")}
                            <Check className="h-4 w-4 ml-2" />
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
