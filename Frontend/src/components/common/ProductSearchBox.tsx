import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
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
const formatPrice = (price: number) => `${price.toLocaleString("vi-VN")}đ`;

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
    const [activeIndex, setActiveIndex] = useState(-1);
    const debouncedQuery = useDebounce(query, 300);
    const navigate = useNavigate();
    const location = useLocation();
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listboxId = useId();
    const hasQuery = Boolean(query.trim());
    const canNavigateSuggestions = open && !loading && !error && suggestions.length > 0;

    useEffect(() => {
        const frameId = window.requestAnimationFrame(() => {
            setQuery(initialValue);
            setActiveIndex(-1);
        });

        return () => window.cancelAnimationFrame(frameId);
    }, [initialValue]);

    const closeSuggestions = useCallback(() => {
        setOpen(false);
        setActiveIndex(-1);
    }, []);

    useClickOutside(wrapperRef, closeSuggestions);

    const performSearch = useCallback(() => {
        const keyword = query.trim();

        if (!keyword) {
            setSuggestions([]);
            closeSuggestions();
            return;
        }

        closeSuggestions();
        onSearchComplete?.();
        const params = new URLSearchParams(location.search);
        params.set("q", keyword);
        navigate({ pathname: "/shop", search: `?${params.toString()}` });
    }, [closeSuggestions, location.search, navigate, onSearchComplete, query]);

    const goToProduct = useCallback((product: ProductSuggestion) => {
        closeSuggestions();
        onSearchComplete?.();
        navigate(`/product/${product.id}`);
    }, [closeSuggestions, navigate, onSearchComplete]);

    const clearSearch = () => {
        setQuery("");
        setSuggestions([]);
        setError("");
        closeSuggestions();
        inputRef.current?.focus();
    };

    useEffect(() => {
        const keyword = debouncedQuery.trim();

        if (!keyword) {
            const frameId = window.requestAnimationFrame(() => {
                setSuggestions([]);
                setError("");
                setLoading(false);
                closeSuggestions();
            });

            return () => window.cancelAnimationFrame(frameId);
        }

        const controller = new AbortController();
        const frameId = window.requestAnimationFrame(() => {
            setLoading(true);
            setError("");
            setActiveIndex(-1);
            setOpen(true);
        });

        productService.getSuggestions(keyword, 6, controller.signal)
            .then((items) => {
                if (!controller.signal.aborted) setSuggestions(items);
            })
            .catch((requestError: unknown) => {
                if (axios.isCancel(requestError) || (requestError instanceof DOMException && requestError.name === "AbortError")) {
                    return;
                }
                if (!controller.signal.aborted) {
                    setSuggestions([]);
                    setError("Không thể tải gợi ý tìm kiếm. Bạn vẫn có thể tìm bằng từ khóa này.");
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });

        return () => {
            window.cancelAnimationFrame(frameId);
            controller.abort();
        };
    }, [closeSuggestions, debouncedQuery]);

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
                        <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    )}
                    <input
                        ref={inputRef}
                        autoComplete="off"
                        autoFocus={autoFocus}
                        type="search"
                        id={inputId}
                        value={query}
                        role="combobox"
                        aria-autocomplete="list"
                        aria-expanded={open && hasQuery}
                        aria-controls={open && hasQuery ? listboxId : undefined}
                        aria-activedescendant={canNavigateSuggestions && activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined}
                        onChange={(event) => {
                            const value = event.target.value;
                            setQuery(value);
                            setActiveIndex(-1);
                            setOpen(Boolean(value.trim()));
                        }}
                        onFocus={() => {
                            if (query.trim()) setOpen(true);
                        }}
                        onKeyDown={(event) => {
                            if (event.key === "Escape") {
                                event.preventDefault();
                                closeSuggestions();
                                return;
                            }

                            if (event.key === "ArrowDown" && suggestions.length > 0) {
                                event.preventDefault();
                                setOpen(true);
                                setActiveIndex((index) => Math.min(index + 1, suggestions.length - 1));
                                return;
                            }

                            if (event.key === "ArrowUp" && suggestions.length > 0) {
                                event.preventDefault();
                                setActiveIndex((index) => Math.max(index - 1, 0));
                                return;
                            }

                            if (event.key === "Enter" && canNavigateSuggestions && activeIndex >= 0) {
                                event.preventDefault();
                                goToProduct(suggestions[activeIndex]);
                            }
                        }}
                        placeholder={placeholder}
                        className={inputClassName}
                    />
                    {hasQuery && (
                        <button
                            type="button"
                            onClick={clearSearch}
                            className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-subtle hover:text-text-strong"
                            aria-label="Xóa từ khóa tìm kiếm"
                        >
                            <X aria-hidden="true" className="size-4" />
                        </button>
                    )}
                </div>
                <button type="submit" className={buttonClassName} aria-label="Tìm kiếm">
                    {buttonLabel}
                </button>
            </form>

            {open && hasQuery && (
                <div className="absolute left-0 right-0 top-full z-dropdown mt-2 overflow-hidden rounded-lg border border-border bg-surface-elevated shadow-elevation-2">
                    {loading && <p className="px-4 py-3 text-sm text-muted-foreground" role="status">Đang tìm gợi ý…</p>}
                    {!loading && error && <p className="px-4 py-3 text-sm leading-6 text-muted-foreground" role="status">{error}</p>}
                    {!loading && !error && suggestions.length === 0 && (
                        <p className="px-4 py-3 text-sm text-muted-foreground" role="status">Không tìm thấy gợi ý phù hợp.</p>
                    )}
                    {!loading && !error && suggestions.length > 0 && (
                        <ul id={listboxId} role="listbox" aria-label="Gợi ý sản phẩm" className="max-h-96 overflow-y-auto py-1">
                            {suggestions.map((product, index) => (
                                <li key={product.id} role="presentation">
                                    <button
                                        id={`${listboxId}-option-${index}`}
                                        type="button"
                                        role="option"
                                        aria-selected={activeIndex === index}
                                        onMouseMove={() => setActiveIndex(index)}
                                        onClick={() => goToProduct(product)}
                                        className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-fast ease-standard ${
                                            activeIndex === index ? "bg-primary-subtle" : "hover:bg-surface-subtle"
                                        }`}
                                    >
                                        <img
                                            src={product.image || FALLBACK_IMAGE}
                                            alt=""
                                            onError={(event) => {
                                                event.currentTarget.src = FALLBACK_IMAGE;
                                            }}
                                            className="h-14 w-14 shrink-0 rounded-md bg-muted object-cover"
                                            loading="lazy"
                                        />
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-semibold text-text-strong">{product.name}</span>
                                            <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                                                <span>{product.categoryName}</span>
                                                <span aria-hidden="true">•</span>
                                                <span className={product.inStock ? "text-success" : "text-destructive"}>
                                                    {product.inStock ? `Còn ${product.stock} sản phẩm` : "Hết hàng"}
                                                </span>
                                            </span>
                                        </span>
                                        <span className="shrink-0 text-sm font-bold text-primary">{formatPrice(product.price)}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
};

export default ProductSearchBox;
