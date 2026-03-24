import { useState, useEffect, useCallback } from "react";
import { productService, type ProductFilters } from "@/services/productService";
import type { Product } from "@/types/product";

interface UseProductsResult {
    products: Product[];
    total: number;
    totalPages: number;
    loading: boolean;
    error: string | null;
    refetch: () => void;
}

/**
 * Fetches a paginated product list from the API whenever `filters` change.
 * Provides loading, error, and a refetch callback.
 */
export function useProducts(filters: ProductFilters = {}): UseProductsResult {
    const [products, setProducts] = useState<Product[]>([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tick, setTick] = useState(0);                   // refetch trigger

    const refetch = useCallback(() => setTick((t) => t + 1), []);

    // Serialize filters to detect real changes without causing infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const filterKey = JSON.stringify(filters);

    useEffect(() => {
        let cancelled = false;

        const fetch = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await productService.getAll(JSON.parse(filterKey));
                if (!cancelled) {
                    setProducts(res.data);
                    setTotal(res.total);
                    setTotalPages(res.totalPages);
                }
            } catch (err: unknown) {
                if (!cancelled) {
                    const msg = err instanceof Error ? err.message : "Không thể tải sản phẩm.";
                    setError(msg);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetch();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterKey, tick]);

    return { products, total, totalPages, loading, error, refetch };
}
