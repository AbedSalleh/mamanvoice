import { useState, useEffect, createContext, useContext, ReactNode } from "react";

export type Language = "en" | "ms";

export const translations = {
    en: {
        "app.title": "MamanVoice",
        "mode.parent": "Parent Mode",
        "mode.child": "Child Mode",
        "action.back": "Back",
        "action.add": "Add Card",
        "header.tip.child": "Tap to speak. Hold shield to unlock.",
        "header.tip.parent": "Tip: in Child Mode, tapping cards speaks immediately.",
        "action.next": "Next",
        "warning.local": "Warning: Data is saved LOCALLY. Export backup (in Settings) to save progress.",
        "hint.child": "Tap a card to speak. (Hold the shield to unlock Parent Mode.)",
        "empty.title": "Nothing here yet",
        "empty.subtitle": "Unlock Parent Mode to add cards.",

        // Settings
        "settings.title": "Parent Settings",
        "settings.language": "Language",
        "settings.backup.title": "Backup & Restore",
        "settings.backup.subtitle": "Export everything (including images and audio) to a single JSON file.",
        "action.export": "Export Backup",
        "action.import": "Import Backup",
        "settings.tip": "Tip: keep your backup file somewhere safe (Google Drive, email, etc.).",
        "settings.attribution": "Pictograms by Mulberry Symbols (CC-BY-SA)",

        // Editor
        "editor.add.title": "Add New Card",
        "editor.edit.title": "Edit Card",
        "editor.label": "Label",
        "editor.label.placeholder": "e.g., Cookie",
        "editor.image": "Image",
        "editor.tabs.library": "Library",
        "editor.tabs.upload": "Upload",
        "editor.type": "Type",
        "editor.type.speak": "Speak",
        "editor.type.speak.desc": "Plays audio (or TTS)",
        "editor.type.folder": "Folder",
        "editor.type.folder.desc": "Opens a category",
        "editor.audio": "Audio",
        "editor.record": "Record",
        "editor.stop": "Stop",
        "editor.audio.help": "Record a short, clear voice clip (or leave empty to use text-to-speech).",
        "action.cancel": "Cancel",
        "action.save": "Save",
        "action.delete": "Delete",

        // Symbol Picker
        "library.title": "Smart Symbol Library",
        "library.desc": "Download a library of common AAC symbols to use offline (approx 10KB).",
        "library.enable": "Enable Library",
        "library.loading": "Downloading library...",
        "library.error": "Failed to load symbols. Please check internet.",
        "library.search": "Search Apple, Happy, Car...",
        "library.empty": "No symbols found for",

        // Upload
        "upload.preview": "Use this image",
        "upload.instructions": "Click to upload or drag & drop",
        "upload.alt": "Preview",
        "upload.choose_file": "Choose File",
        "upload.no_image": "No image selected",

        // Dynamic Strings
        "editor.audio.status": "Audio",
        "editor.tts.status": "TTS",
        "action.edit": "Edit",
        "action.clear": "Clear",

        // Toasts & Messages
        "editor.audio.permission_error": "Microphone permission is required to record audio.",
        "mode.parent_unlocked": "Parent mode unlocked",
        "mode.child_locked": "Child mode locked",
        "toast.updated": "Updated",
        "toast.added": "Added",
        "toast.folder_not_empty": "This folder has cards inside. Delete them first.",
        "toast.deleted": "Deleted",
        "toast.backup_exported": "Backup exported",
        "toast.invalid_backup": "Invalid backup file",
        "toast.backup_imported": "Backup imported",
        "toast.import_failed": "Could not import backup",
    },
    ms: {
        "app.title": "MamanVoice",
        "mode.parent": "Mod Ibu Bapa",
        "mode.child": "Mod Anak",
        "action.back": "Kembali",
        "action.add": "Tambah Kad",
        "header.tip.child": "Tekan untuk cakap. Tahan perisai untuk buka kunci.",
        "header.tip.parent": "Tip: dalam Mod Anak, kad akan terus bercakap apabila ditekan.",
        "action.next": "Seterusnya",
        "warning.local": "Amaran: Data disimpan SECARA LOKAL. Eksport sandaran (dalam Tetapan) untuk simpan.",
        "hint.child": "Tekan kad untuk bercakap. (Tahan perisai untuk buka kunci Mod Ibu Bapa.)",
        "empty.title": "Tiada apa-apa di sini",
        "empty.subtitle": "Buka Mod Ibu Bapa untuk menambah kad.",

        // Settings
        "settings.title": "Tetapan Ibu Bapa",
        "settings.language": "Bahasa",
        "settings.backup.title": "Sandaran & Pemulihan",
        "settings.backup.subtitle": "Eksport semuanya (termasuk gambar dan audio) ke dalam satu fail JSON.",
        "action.export": "Eksport Sandaran",
        "action.import": "Import Sandaran",
        "settings.tip": "Tip: simpan fail sandaran anda di tempat selamat (Google Drive, e-mel, dll.).",
        "settings.attribution": "Piktogram oleh Mulberry Symbols (CC-BY-SA)",

        // Editor
        "editor.add.title": "Tambah Kad Baru",
        "editor.edit.title": "Sunting Kad",
        "editor.label": "Label",
        "editor.label.placeholder": "cth., Biskut",
        "editor.image": "Gambar",
        "editor.tabs.library": "Pustaka",
        "editor.tabs.upload": "Muat Naik",
        "editor.type": "Jenis",
        "editor.type.speak": "Cakap",
        "editor.type.speak.desc": "Mainkan audio (atau TTS)",
        "editor.type.folder": "Folder",
        "editor.type.folder.desc": "Buka kategori",
        "editor.audio": "Audio",
        "editor.record": "Rekod",
        "editor.stop": "Berhenti",
        "editor.audio.help": "Rekod klip suara pendek dan jelas (atau biarkan kosong untuk guna teks-ke-suara).",
        "action.cancel": "Batal",
        "action.save": "Simpan",
        "action.delete": "Buang",

        // Symbol Picker
        "library.title": "Pustaka Simbol Pintar",
        "library.desc": "Muat turun pustaka simbol AAC biasa untuk guna luar talian (kira-kira 10KB).",
        "library.enable": "Aktifkan Pustaka",
        "library.loading": "Sedang memuat turun pustaka...",
        "library.error": "Gagal memuat turun simbol. Sila semak internet.",
        "library.search": "Cari Epal, Gembira, Kereta...",
        "library.empty": "Tiada simbol dijumpai untuk",

        // Upload
        "upload.preview": "Guna gambar ini",
        "upload.instructions": "Klik untuk muat naik atau seret & lepas",
        "upload.alt": "Pratonton",
        "upload.choose_file": "Pilih Fail",
        "upload.no_image": "Tiada gambar dipilih",

        // Dynamic Strings
        "editor.audio.status": "Audio",
        "editor.tts.status": "TTS",
        "action.edit": "Sunting",
        "action.clear": "Padam", // Reusing clear (Padam) for consistency

        // Toasts & Messages
        "editor.audio.permission_error": "Kebenaran mikrofon diperlukan untuk merakam audio.",
        "mode.parent_unlocked": "Mod Ibu Bapa dibuka",
        "mode.child_locked": "Mod Anak dikunci",
        "toast.updated": "Dikemaskini",
        "toast.added": "Ditambah",
        "toast.folder_not_empty": "Folder ini ada kad di dalamnya. Padam kad dahulu.",
        "toast.deleted": "Dibuang",
        "toast.backup_exported": "Sandaran dieksport",
        "toast.invalid_backup": "Fail sandaran tidak sah",
        "toast.backup_imported": "Sandaran diimport",
        "toast.import_failed": "Gagal mengimport sandaran",
    }
} as const;

type LanguageContextType = {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: keyof typeof translations["en"]) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguage] = useState<Language>(() => {
        const saved = localStorage.getItem("mamanvoice-lang");
        return (saved === "ms" ? "ms" : "en");
    });

    useEffect(() => {
        localStorage.setItem("mamanvoice-lang", language);
    }, [language]);

    const t = (key: keyof typeof translations["en"]) => {
        return translations[language][key] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }
        }>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error("useLanguage must be used within a LanguageProvider");
    }
    return context;
}
