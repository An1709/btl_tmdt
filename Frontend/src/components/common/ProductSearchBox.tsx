import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import axios from "axios";
import { productService, type ProductSuggestion } from "@/services/productService";
import { useClickOutside } from "@/hooks/useClickOutside";
import { useDebounce } from "@/hooks/useDebounce";
import { IMAGE_ASSETS } from "@/utils/constants";

interface ProductSearchBoxProps {
    initialValue?: string;
    inputId?: string;
    placeholder?: string;
    wrapperClassName?: string;
    formClassName?: string;
    inputClassName?: string;
    buttonClassName?: string;
    buttonLabel?: string;
    showLeadingIcon?: boolean;
    autoFocus?: boolean;
    onSearchComplete?: () => void;
}

const FALLBACK_IMAGE = IMAGE_ASSETS.placeholder;

const formatPrice = (price: number) => price.toLocaleString("vi-VN") + "đ";

const ProductSearchBox = ({
    initialValue = "",
    inputId,
    placeholder = "Tìm thú cưng, phụ kiện...",
    wrapperClassName = "",
    formClassName = "flex gap-2",
    inputClassName = "",
    buttonClassName = "btn-pet-primary py-2 px-5 text-sm",
    buttonLabel = "Tìm",
    showLeadingIcon = false,
    autoFocus = false,
    onSearchComplete,
}: ProductSearchBoxProps) => {
    const [query, setQuery] = useState(initialValue);
    const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [open, setOpen] = useState(false);
    const debouncedQuery = useDebounce(query, 300);
    const navigate = useNavigate();
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setQuery(initialValue);
    }, [initialValue]);

    const closeSuggestions = useCallback(() => {
        setOpen(false);
    }, []);

    useClickOutside(wrapperRef, closeSuggestions);

    const performSearch = useCallback(() => {
        const keyword = query.trim();

        if (!keyword) {
            setSuggestions([]);
            setOpen(false);
            return;
        }

        setOpen(false);
        onSearchComplete?.();
        navigate(`/shop?q=${encodeURIComponent(keyword)}`);
    }, [navigate, onSearchComplete, query]);

    const goToProduct = (product: ProductSuggestion) => {
        setOpen(false);
        onSearchComplete?.();
        navigate(`/product/${product.id}`);
    };

    useEffect(() => {
        const keyword = debouncedQuery.trim();

        if (!keyword) {
            setSuggestions([]);
            setError("");
            setLoading(false);
            setOpen(false);
            return;
        }

        const controller = new AbortController();
        setLoading(true);
        setError("");
        setOpen(true);

        productService.getSuggestions(keyword, 6, controller.signal)
            .then((items) => {
                setSuggestions(items);
            })
            .catch((err: unknown) => {
                if (axios.isCancel(err) || (err instanceof DOMException && err.name === "AbortError")) {
                    return;
                }
                setSuggestions([]);
                setError("Không thể tải gợi ý tìm kiếm.");
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            });

        return () => controller.abort();
    }, [debouncedQuery]);

    return (
        <div ref={wrapperRef} className={`relative ${wrapperClassName}`}>
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    performSearch();
                }}
                className={formClassName}
            >
                <div className="relative flex-1">
                    {showLeadingIcon && (
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">🔍</span>
                    )}
                    <input
                        autoComplete="off"
                        autoFocus={autoFocus}
                        type="text"
                        id={inputId}
                        value={query}
                        onChange={(event) => {
                            const value = event.target.value;
                            setQuery(value);
                            setOpen(Boolean(value.trim()));
                        }}
                        onFocus={() => {
                            if (query.trim()) setOpen(true);
                        }}
                        onKeyDown={(event) => {
                            if (event.key === "Escape") {
                                event.preventDefault();
                                closeSuggestions();
                            }
                        }}
                        placeholder={placeholder}
                        className={inputClassName}
                    />
                </div>
                <button type="submit" className={buttonClassName} aria-label="Tìm kiếm">
                    {buttonLabel}
                </button>
            </form>

            {open && query.trim() && (
                <div className="absolute left-0 right-0 top-full mt-2 z-[60] overflow-hidden rounded-2xl border border-border bg-white shadow-xl dark:bg-card">
                    {loading && (
                        <div className="px-4 py-3 text-sm text-muted-foreground">Đang tìm kiếm...</div>
                    )}

                    {!loading && error && (
                        <div className="px-4 py-3 text-sm text-muted-foreground">{error}</div>
                    )}

                    {!loading && !error && suggestions.length === 0 && (
                        <div className="px-4 py-3 text-sm text-muted-foreground">Không tìm thấy sản phẩm phù hợp.</div>
                    )}

                    {!loading && !error && suggestions.length > 0 && (
                        <div className="max-h-96 overflow-y-auto py-1">
                            {suggestions.map((product) => (
                                <button
                                    key={product.id}
                                    type="button"
                                    onClick={() => goToProduct(product)}
                                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-red-50 dark:hover:bg-red-950/30"
                                >
                                    <img
                                        src={product.image || FALLBACK_IMAGE}
                                        alt={product.name}
                                        onError={(event) => {
                                            event.currentTarget.src = FALLBACK_IMAGE;
                                        }}
                                        className="h-14 w-14 shrink-0 rounded-xl border border-border object-cover bg-muted"
                                        loading="lazy"
                                    />
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-bold text-foreground">{product.name}</span>
                                        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                                            <span>{product.categoryName}</span>
                                            <span className="opacity-50">•</span>
                                            <span className={product.inStock ? "text-emerald-600" : "text-red-500"}>
                                                {product.inStock ? `Còn ${product.stock} sản phẩm` : "Hết hàng"}
                                            </span>
                                        </span>
                                    </span>
                                    <span className="shrink-0 text-sm font-extrabold text-[var(--pet-coral)]">
                                        {formatPrice(product.price)}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ProductSearchBox;
