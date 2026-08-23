import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaginationProps {
    page: number;
    totalPages: number;
    onChange: (page: number) => void;
}

const getPages = (page: number, totalPages: number): (number | "ellipsis")[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
    const pages: (number | "ellipsis")[] = [1];
    if (page > 3) pages.push("ellipsis");
    for (let index = Math.max(2, page - 1); index <= Math.min(totalPages - 1, page + 1); index += 1) pages.push(index);
    if (page < totalPages - 2) pages.push("ellipsis");
    pages.push(totalPages);
    return pages;
};

const Pagination = ({ page, totalPages, onChange }: PaginationProps) => {
    if (totalPages <= 1) return null;

    return (
        <nav className="mt-10 flex flex-wrap items-center justify-center gap-1.5" aria-label="Phân trang">
            <Button type="button" variant="outline" size="sm" onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Trang trước">
                <ChevronLeft aria-hidden="true" /> <span className="hidden sm:inline">Trước</span>
            </Button>

            <div className="flex items-center gap-1" aria-label={`Trang ${page} trên ${totalPages}`}>
                {getPages(page, totalPages).map((item, index) => item === "ellipsis" ? (
                    <span key={`ellipsis-${index}`} className="inline-flex size-9 items-center justify-center text-muted-foreground" aria-hidden="true">…</span>
                ) : (
                    <Button
                        key={item}
                        type="button"
                        variant={item === page ? "default" : "ghost"}
                        size="icon-sm"
                        onClick={() => onChange(item)}
                        aria-current={item === page ? "page" : undefined}
                        aria-label={`Trang ${item}`}
                    >
                        {item}
                    </Button>
                ))}
            </div>

            <Button type="button" variant="outline" size="sm" onClick={() => onChange(page + 1)} disabled={page >= totalPages} aria-label="Trang sau">
                <span className="hidden sm:inline">Sau</span> <ChevronRight aria-hidden="true" />
            </Button>
        </nav>
    );
};

export default Pagination;
