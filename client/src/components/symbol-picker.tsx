import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Search, Loader2, DownloadCloud } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

type SymbolItem = {
    name: string;
    tags: string[];
    svg: string;
};

// Lazy fetch function
const fetchSymbols = async (): Promise<SymbolItem[]> => {
    const res = await fetch("symbols.json");
    if (!res.ok) throw new Error("Failed to load symbols");
    return res.json();
};

export function SymbolPicker({ onSelect }: { onSelect: (blob: Blob) => void }) {
    const [enabled, setEnabled] = useState(false);
    const [search, setSearch] = useState("");

    const { data: symbols, isLoading, isError } = useQuery({
        queryKey: ["symbols"],
        queryFn: fetchSymbols,
        enabled: enabled, // Only fetch when user clicks enable
        staleTime: Infinity, // Cache forever
    });

    const filtered = symbols?.filter((s) => {
        const q = search.toLowerCase();
        return (
            s.name.toLowerCase().includes(q) ||
            s.tags.some((t) => t.toLowerCase().includes(q))
        );
    });

    const handleSelect = (svgString: string) => {
        // Convert SVG string to Blob
        const blob = new Blob([svgString], { type: "image/svg+xml" });
        onSelect(blob);
    };

    if (!enabled) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-muted/20 rounded-2xl border-2 border-dashed">
                <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <DownloadCloud className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">Smart Symbol Library</h3>
                <p className="text-sm text-muted-foreground max-w-[280px] mb-6">
                    Download a library of common AAC symbols to use offline (approx 10KB).
                </p>
                <Button onClick={() => setEnabled(true)} className="rounded-xl">
                    Enable Library
                </Button>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mb-2" />
                <span className="text-sm">Downloading library...</span>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="text-center p-8 text-destructive">
                Failed to load symbols. Please check internet.
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search Apple, Happy, Car..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 h-11 rounded-xl"
                />
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 max-h-[240px] overflow-y-auto pr-1">
                {filtered?.map((s) => (
                    <button
                        key={s.name}
                        type="button"
                        onClick={() => handleSelect(s.svg)}
                        className={cn(
                            "aspect-square rounded-xl border bg-card",
                            "flex flex-col items-center justify-center gap-1",
                            "hover:border-primary/50 hover:bg-primary/5 transition",
                            "focus:ring-2 focus:ring-primary focus:outline-none"
                        )}
                        title={s.name}
                    >
                        <div
                            className="w-8 h-8 text-foreground"
                            dangerouslySetInnerHTML={{ __html: s.svg }}
                        />
                        <span className="text-[10px] text-muted-foreground font-medium truncate w-full px-1 text-center">
                            {s.name}
                        </span>
                    </button>
                ))}
                {filtered?.length === 0 && (
                    <div className="col-span-full py-8 text-center text-sm text-muted-foreground">
                        No symbols found for "{search}"
                    </div>
                )}
            </div>
        </div>
    );
}
