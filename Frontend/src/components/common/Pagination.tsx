interface PaginationProps {
    page: number;
    totalPages: number;
    onChange: (page: number) => void;
}

const Pagination = ({ page, totalPages, onChange }: PaginationProps) => {
    if (totalPages <= 1) return null;

    const getPages = (): (number | "...")[] => {
        if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
        const pages: (number | "...")[] = [1];
        if (page > 3) pages.push("...");
        for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
            pages.push(i);
        }
        if (page < totalPages - 2) pages.push("...");
        pages.push(totalPages);
        return pages;
    };

    return (
        <nav className="flex items-center justify-center gap-1.5 mt-10" aria-label="Phân trang">
            {/* Prev */}
            <button
                onClick={() => onChange(page - 1)}
                disabled={page === 1}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-semibold
                   text-muted-foreground hover:text-[var(--pet-coral)] hover:bg-red-50
                   disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                aria-label="Trang trước"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Trước
            </button>

            {/* Pages */}
            {getPages().map((p, i) =>
                p === "..." ? (
                    <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground select-none">…</span>
                ) : (
                    <button
                        key={p}
                        onClick={() => onChange(p as number)}
                        aria-current={p === page ? "page" : undefined}
                        className={`min-w-[38px] h-[38px] rounded-xl text-sm font-semibold transition-all
              ${p === page
                                ? "bg-[var(--pet-coral)] text-white shadow-md"
                                : "text-muted-foreground hover:text-[var(--pet-coral)] hover:bg-red-50"
                            }`}
                    >
                        {p}
                    </button>
                )
            )}

            {/* Next */}
            <button
                onClick={() => onChange(page + 1)}
                disabled={page === totalPages}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-semibold
                   text-muted-foreground hover:text-[var(--pet-coral)] hover:bg-red-50
                   disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                aria-label="Trang sau"
            >
                Sau
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
            </button>
        </nav>
    );
};

export default Pagination;