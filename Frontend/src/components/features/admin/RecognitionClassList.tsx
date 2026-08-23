import { useId, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PetVisionClassInfo } from "@/services/adminPetVisionService";

interface RecognitionClassListProps {
    classes: PetVisionClassInfo[];
}

type SpeciesFilter = "all" | "dog" | "cat";

const MOBILE_PREVIEW_COUNT = 5;
const TABLET_PREVIEW_COUNT = 6;
const DESKTOP_PREVIEW_COUNT = 8;

const normalizeSearchText = (value: string) => value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/giu, "d")
    .toLocaleLowerCase("vi")
    .trim();

const getSpeciesFilter = (item: PetVisionClassInfo): Exclude<SpeciesFilter, "all"> | null => {
    const species = normalizeSearchText(item.species || "");
    if (species === "cho" || species === "dog" || species.startsWith("cho ")) return "dog";
    if (species === "meo" || species === "cat" || species.startsWith("meo ")) return "cat";

    const label = normalizeSearchText(item.label || item.displayName);
    if (label.startsWith("cho ")) return "dog";
    if (label.startsWith("meo ")) return "cat";
    return null;
};

const getPreviewVisibility = (index: number) => {
    if (index >= TABLET_PREVIEW_COUNT) return "hidden lg:flex";
    if (index >= MOBILE_PREVIEW_COUNT) return "hidden sm:flex";
    return "flex";
};

const RecognitionClassList = ({ classes }: RecognitionClassListProps) => {
    const [expanded, setExpanded] = useState(false);
    const [query, setQuery] = useState("");
    const [speciesFilter, setSpeciesFilter] = useState<SpeciesFilter>("all");
    const panelId = useId();
    const expandButtonRef = useRef<HTMLButtonElement>(null);

    const speciesCounts = useMemo(() => classes.reduce(
        (counts, item) => {
            const species = getSpeciesFilter(item);
            if (species) counts[species] += 1;
            return counts;
        },
        { dog: 0, cat: 0 },
    ), [classes]);

    const filteredClasses = useMemo(() => {
        const normalizedQuery = normalizeSearchText(query);

        return classes.filter((item) => {
            if (speciesFilter !== "all" && getSpeciesFilter(item) !== speciesFilter) return false;
            if (!normalizedQuery) return true;

            return normalizeSearchText([
                item.displayName,
                item.label,
                item.species,
                item.breed,
            ].filter(Boolean).join(" ")).includes(normalizedQuery);
        });
    }, [classes, query, speciesFilter]);

    const previewClasses = classes.slice(0, DESKTOP_PREVIEW_COUNT);
    const showSpeciesFilters = speciesCounts.dog > 0 || speciesCounts.cat > 0;
    const hasMoreThanPreview = classes.length > MOBILE_PREVIEW_COUNT;

    const filters: Array<{ id: SpeciesFilter; label: string; count: number }> = [
        { id: "all", label: "Tất cả", count: classes.length },
        ...(speciesCounts.dog > 0 ? [{ id: "dog" as const, label: "Chó", count: speciesCounts.dog }] : []),
        ...(speciesCounts.cat > 0 ? [{ id: "cat" as const, label: "Mèo", count: speciesCounts.cat }] : []),
    ];

    const collapseList = () => {
        setExpanded(false);
        setQuery("");
        setSpeciesFilter("all");
        requestAnimationFrame(() => expandButtonRef.current?.focus());
    };

    return (
        <section className="mt-6 border-t border-divider pt-5" aria-labelledby="recognition-classes-heading">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <h3 id="recognition-classes-heading" className="text-sm font-bold text-foreground">
                    Các lớp nhận diện
                </h3>
                <p className="shrink-0 text-xs text-muted-foreground">{classes.length} lớp</p>
            </div>

            {classes.length === 0 ? (
                <p className="mt-4 rounded-lg bg-background px-4 py-5 text-center text-sm text-muted-foreground">
                    Chưa tìm thấy lớp nhận diện. Hãy kiểm tra Backend/ml/dataset/train hoặc labels.json.
                </p>
            ) : expanded ? (
                <div id={panelId} className="mt-4 space-y-4">
                    <div className="relative">
                        <label htmlFor="recognition-class-search" className="sr-only">Tìm lớp nhận diện</label>
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                        <Input
                            id="recognition-class-search"
                            type="search"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Tìm giống chó hoặc mèo..."
                            className="pl-9"
                            autoComplete="off"
                            autoFocus
                        />
                    </div>

                    {showSpeciesFilters && (
                        <div className="flex flex-wrap gap-2" role="group" aria-label="Lọc lớp nhận diện theo loài">
                            {filters.map((filter) => {
                                const selected = speciesFilter === filter.id;
                                return (
                                    <button
                                        key={filter.id}
                                        type="button"
                                        aria-pressed={selected}
                                        onClick={() => setSpeciesFilter(filter.id)}
                                        className={`min-h-11 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors duration-base focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-focus/45 ${selected
                                            ? "border-primary bg-primary-subtle text-primary-subtle-foreground"
                                            : "border-border bg-surface text-muted-foreground hover:bg-surface-subtle hover:text-foreground"
                                        }`}
                                    >
                                        {filter.label} <span className="ml-1 text-xs">{filter.count}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    <div
                        className="max-h-[20rem] overflow-y-auto overscroll-contain rounded-md border border-border bg-surface p-3 sm:max-h-[22rem] lg:max-h-[26rem]"
                        tabIndex={0}
                        aria-label={`Danh sách ${filteredClasses.length} trên ${classes.length} lớp nhận diện`}
                    >
                        {filteredClasses.length === 0 ? (
                            <p className="px-3 py-8 text-center text-sm text-muted-foreground" role="status">
                                Không tìm thấy lớp nhận diện phù hợp.
                            </p>
                        ) : (
                            <ul className="divide-y divide-divider">
                                {filteredClasses.map((item) => (
                                    <li
                                        key={item.label}
                                        className="min-w-0 px-3 py-2.5 text-sm font-medium text-foreground"
                                        title={item.label}
                                    >
                                        <span className="block break-words">{item.displayName}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs text-muted-foreground" aria-live="polite">
                            {filteredClasses.length === classes.length
                                ? `${classes.length} lớp`
                                : `${filteredClasses.length} / ${classes.length} lớp`}
                        </p>
                        <Button type="button" variant="ghost" size="sm" onClick={collapseList} aria-expanded="true" aria-controls={panelId}>
                            <ChevronUp aria-hidden="true" /> Thu gọn
                        </Button>
                    </div>
                </div>
            ) : (
                <div id={panelId} className="mt-3">
                    <ul className="divide-y divide-divider" aria-label="Xem trước các lớp nhận diện">
                        {previewClasses.map((item, index) => (
                            <li
                                key={item.label}
                                className={`${getPreviewVisibility(index)} min-w-0 items-center py-2 text-sm font-medium text-foreground`}
                                title={item.label}
                            >
                                <span className="break-words">{item.displayName}</span>
                            </li>
                        ))}
                    </ul>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        {hasMoreThanPreview ? (
                            <p className="text-xs text-muted-foreground">
                                {classes.length > MOBILE_PREVIEW_COUNT && <span className="sm:hidden">+{classes.length - MOBILE_PREVIEW_COUNT} lớp khác</span>}
                                {classes.length > TABLET_PREVIEW_COUNT && <span className="hidden sm:inline lg:hidden">+{classes.length - TABLET_PREVIEW_COUNT} lớp khác</span>}
                                {classes.length > DESKTOP_PREVIEW_COUNT && <span className="hidden lg:inline">+{classes.length - DESKTOP_PREVIEW_COUNT} lớp khác</span>}
                            </p>
                        ) : <span />}
                        <Button ref={expandButtonRef} type="button" variant="ghost" size="sm" onClick={() => setExpanded(true)} aria-expanded="false" aria-controls={panelId}>
                            Xem {classes.length} lớp <ChevronDown aria-hidden="true" />
                        </Button>
                    </div>
                </div>
            )}
        </section>
    );
};

export default RecognitionClassList;
