import { useState, useEffect, useCallback } from "react";
import { productService } from "@/services/productService";
import type { Product } from "@/types/product";
import DataTable, { type Column } from "@/components/features/admin/DataTable";
import { formatCurrency } from "@/utils/format";
import { toast } from "sonner";

const ProductManagePage = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    const loadProducts = useCallback(async () => {
        setLoading(true);
        try {
            const res = await productService.getAll({ limit: 100 });
            setProducts(res.data);
        } catch {
            toast.error("Không thể tải danh sách sản phẩm.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadProducts(); }, [loadProducts]);

    const handleDelete = async (id: string) => {
        if (!confirm("Bạn có chắc muốn xóa sản phẩm này?")) return;
        try {
            await productService.delete(id);
            toast.success("Đã xóa sản phẩm.");
            // Optimistic update — remove from local state immediately, then refresh
            setProducts((prev) => prev.filter((p) => p.id !== id));
        } catch {
            toast.error("Xóa thất bại. Vui lòng thử lại.");
        }
    };

    const columns: Column<Product>[] = [
        {
            key: "product", header: "Sản phẩm", render: (p) => (
                <div className="flex items-center gap-3">
                    <img src={p.image} alt={p.name} className="w-10 h-10 rounded-xl object-cover border border-border" />
                    <div>
                        <p className="text-sm font-semibold text-foreground line-clamp-1">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.breed}</p>
                    </div>
                </div>
            )
        },
        { key: "category", header: "Loại", render: (p) => <span className="badge-new capitalize">{p.category}</span> },
        { key: "price", header: "Giá", render: (p) => <span className="font-bold text-[var(--pet-coral)]">{formatCurrency(p.price)}</span> },
        { key: "rating", header: "⭐", render: (p) => <span className="text-sm text-foreground">{p.rating.toFixed(1)} ({p.reviewCount})</span> },
        {
            key: "stock", header: "Tồn kho", render: (p) => (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${p.inStock ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
                    {p.inStock ? "Còn hàng" : "Hết hàng"}
                </span>
            )
        },
    ];

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="section-title">
                    🐾 Quản Lý Sản Phẩm ({loading ? "..." : products.length})
                </h1>
                <button className="btn-pet-primary">+ Thêm sản phẩm</button>
            </div>

            {loading ? (
                <div className="animate-pulse flex flex-col gap-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-14 bg-muted rounded-xl" />
                    ))}
                </div>
            ) : (
                <DataTable
                    columns={columns}
                    data={products}
                    keyExtractor={(p) => p.id}
                    emptyText="Không có sản phẩm nào."
                    actions={(p) => (
                        <div className="flex gap-2 justify-end">
                            <button className="text-xs px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all font-semibold">Sửa</button>
                            <button onClick={() => handleDelete(p.id)} className="text-xs px-3 py-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all font-semibold">Xóa</button>
                        </div>
                    )}
                />
            )}
        </div>
    );
};

export default ProductManagePage;