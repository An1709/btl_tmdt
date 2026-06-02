import { useState, useEffect, useCallback } from "react";
import { productService, type ProductPayload } from "@/services/productService";
import { categoryService, type DbCategory } from "@/services/categoryService";
import type { Product } from "@/types/product";
import DataTable, { type Column } from "@/components/features/admin/DataTable";
import Pagination from "@/components/common/Pagination";
import { formatCurrency } from "@/utils/format";
import { IMAGE_ASSETS } from "@/utils/constants";
import { toast } from "sonner";

interface ProductFormState {
    name: string;
    price: string;
    stock: string;
    category: string;
    image: string;
    description: string;
    breed: string;
    age: string;
}

const emptyForm: ProductFormState = {
    name: "",
    price: "",
    stock: "0",
    category: "",
    image: "",
    description: "",
    breed: "",
    age: "",
};

const ProductManagePage = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<DbCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [form, setForm] = useState<ProductFormState>(emptyForm);

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalProducts, setTotalProducts] = useState(0);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchTerm, setSearchTerm] = useState("");

    const loadProducts = useCallback(async () => {
        setLoading(true);
        try {
            const res = await productService.getAll({
                page,
                limit: 10,
                search: searchTerm || undefined
            });
            setProducts(res.data);
            setTotalPages(res.totalPages);
            setTotalProducts(res.total);
        } catch {
            toast.error("Không thể tải danh sách sản phẩm.");
        } finally {
            setLoading(false);
        }
    }, [page, searchTerm]);

    const loadCategories = useCallback(async () => {
        try {
            const data = await categoryService.getAll();
            setCategories(data);
        } catch {
            toast.error("Không thể tải danh mục sản phẩm.");
        }
    }, []);

    useEffect(() => {
        loadProducts();
    }, [loadProducts]);

    useEffect(() => {
        loadCategories();
    }, [loadCategories]);

    const categoryLabel = (product: Product) => {
        const match = categories.find(
            (category) => category._id === product.categoryId || category.slug === product.category || category.name === product.category,
        );
        return match?.name ?? product.category;
    };

    const openCreateForm = () => {
        setEditingProduct(null);
        setForm({
            ...emptyForm,
            category: categories[0]?._id ?? "",
        });
        setFormOpen(true);
    };

    const openEditForm = (product: Product) => {
        setEditingProduct(product);
        setForm({
            name: product.name,
            price: String(product.price),
            stock: String(product.stock ?? 0),
            category: product.categoryId ?? "",
            image: product.images?.join(", ") || product.image,
            description: product.description,
            breed: product.breed ?? "",
            age: product.age ?? "",
        });
        setFormOpen(true);
    };

    const closeForm = () => {
        setFormOpen(false);
        setEditingProduct(null);
        setForm(emptyForm);
    };

    const buildPayload = (): ProductPayload | null => {
        const price = Number(form.price);
        const stock = Number(form.stock);

        if (!form.name.trim() || !form.description.trim() || !form.category) {
            toast.error("Vui lòng nhập tên, mô tả và danh mục.");
            return null;
        }

        if (!Number.isFinite(price) || price < 0) {
            toast.error("Giá sản phẩm không hợp lệ.");
            return null;
        }

        if (!Number.isInteger(stock) || stock < 0) {
            toast.error("Tồn kho phải là số nguyên không âm.");
            return null;
        }

        const specifications: Record<string, string> = {};
        if (form.breed.trim()) specifications["Giống"] = form.breed.trim();
        if (form.age.trim()) specifications["Tuổi"] = form.age.trim();

        return {
            name: form.name.trim(),
            price,
            stock,
            category: form.category,
            description: form.description.trim(),
            images: form.image.split(",").map((image) => image.trim()).filter(Boolean),
            specifications,
        };
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        const payload = buildPayload();
        if (!payload) return;

        try {
            setSaving(true);
            if (editingProduct) {
                await productService.update(editingProduct.id, payload);
                toast.success("Đã cập nhật sản phẩm.");
                void loadProducts();
            } else {
                await productService.create(payload);
                toast.success("Đã thêm sản phẩm.");
                setPage(1);
                setSearchTerm("");
                setSearchQuery("");
                void loadProducts();
            }
            closeForm();
        } catch (err: unknown) {
            const message =
                err && typeof err === "object" && "response" in err
                    ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                    : undefined;
            toast.error(message ?? "Không thể lưu sản phẩm. Vui lòng thử lại.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Bạn có chắc muốn xóa sản phẩm này?")) return;
        try {
            await productService.delete(id);
            toast.success("Đã xóa sản phẩm.");
            void loadProducts();
        } catch {
            toast.error("Xóa thất bại. Vui lòng thử lại.");
        }
    };

    const columns: Column<Product>[] = [
        {
            key: "product", header: "Sản phẩm", render: (p) => (
                <div className="flex items-center gap-3">
                    <img src={p.image || IMAGE_ASSETS.placeholder} alt={p.name} className="w-10 h-10 rounded-xl object-cover border border-border" />
                    <div>
                        <p className="text-sm font-semibold text-foreground line-clamp-1">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.breed}</p>
                    </div>
                </div>
            )
        },
        { key: "category", header: "Loại", render: (p) => <span className="badge-new capitalize">{categoryLabel(p)}</span> },
        { key: "price", header: "Giá", render: (p) => <span className="font-bold text-[var(--pet-coral)]">{formatCurrency(p.price)}</span> },
        { key: "rating", header: "Đánh giá", render: (p) => <span className="text-sm text-foreground">{p.rating.toFixed(1)} ({p.reviewCount})</span> },
        {
            key: "stock", header: "Tồn kho", render: (p) => (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${p.inStock ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
                    {p.stock ?? 0}
                </span>
            )
        },
    ];

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="section-title">
                    Quản Lý Sản Phẩm ({loading ? "..." : totalProducts})
                </h1>
                <button onClick={openCreateForm} className="btn-pet-primary">+ Thêm sản phẩm</button>
            </div>

            {/* Search box matching web app aesthetics */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative w-full sm:max-w-md">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">🔍</span>
                    <input
                        type="text"
                        placeholder="Tìm kiếm sản phẩm theo tên..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                setSearchTerm(searchQuery.trim());
                                setPage(1);
                            }
                        }}
                        className="w-full pl-10 pr-20 py-2.5 rounded-xl border border-border bg-white dark:bg-card text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pet-coral)]/40 focus:border-[var(--pet-coral)] transition-all shadow-sm"
                    />
                    <button
                        onClick={() => {
                            setSearchTerm(searchQuery.trim());
                            setPage(1);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-[var(--pet-coral)] text-white text-xs font-semibold rounded-lg hover:opacity-90 transition-all"
                    >
                        Tìm
                    </button>
                </div>
            </div>

            {formOpen && (
                <div className="bg-white dark:bg-card rounded-2xl border border-border p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-3 mb-4">
                        <h2 className="font-bold text-foreground" style={{ fontFamily: "'Nunito', sans-serif" }}>
                            {editingProduct ? "Sửa sản phẩm" : "Thêm sản phẩm"}
                        </h2>
                        <button onClick={closeForm} className="text-xs px-3 py-1.5 bg-muted rounded-lg font-semibold">
                            Đóng
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input className="px-4 py-3 rounded-xl border border-border bg-muted/30 text-sm" placeholder="Tên sản phẩm *" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                        <select className="px-4 py-3 rounded-xl border border-border bg-muted/30 text-sm" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                            <option value="">Chọn danh mục *</option>
                            {categories.map((category) => (
                                <option key={category._id} value={category._id}>{category.name}</option>
                            ))}
                        </select>
                        <input className="px-4 py-3 rounded-xl border border-border bg-muted/30 text-sm" type="number" min="0" placeholder="Giá *" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
                        <input className="px-4 py-3 rounded-xl border border-border bg-muted/30 text-sm" type="number" min="0" step="1" placeholder="Tồn kho *" value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))} />
                        <input className="px-4 py-3 rounded-xl border border-border bg-muted/30 text-sm" placeholder="Giống" value={form.breed} onChange={(e) => setForm((f) => ({ ...f, breed: e.target.value }))} />
                        <input className="px-4 py-3 rounded-xl border border-border bg-muted/30 text-sm" placeholder="Tuổi" value={form.age} onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))} />
                        <input className="md:col-span-2 px-4 py-3 rounded-xl border border-border bg-muted/30 text-sm" placeholder="URL ảnh, cách nhau bằng dấu phẩy" value={form.image} onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))} />
                        <textarea className="md:col-span-2 px-4 py-3 rounded-xl border border-border bg-muted/30 text-sm resize-none" rows={3} placeholder="Mô tả *" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
                        <div className="md:col-span-2 flex justify-end gap-2">
                            <button type="button" onClick={closeForm} className="btn-pet-secondary">Hủy</button>
                            <button type="submit" disabled={saving} className="btn-pet-primary disabled:opacity-50">
                                {saving ? "Đang lưu..." : editingProduct ? "Cập nhật" : "Tạo sản phẩm"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {loading ? (
                <div className="animate-pulse flex flex-col gap-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-14 bg-muted rounded-xl" />
                    ))}
                </div>
            ) : (
                <>
                    <DataTable
                        columns={columns}
                        data={products}
                        keyExtractor={(p) => p.id}
                        emptyText="Không có sản phẩm nào."
                        actions={(p) => (
                            <div className="flex gap-2 justify-end">
                                <button onClick={() => openEditForm(p)} className="text-xs px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all font-semibold">Sửa</button>
                                <button onClick={() => handleDelete(p.id)} className="text-xs px-3 py-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all font-semibold">Xóa</button>
                            </div>
                        )}
                    />
                    <Pagination
                        page={page}
                        totalPages={totalPages}
                        onChange={setPage}
                    />
                </>
            )}
        </div>
    );
};

export default ProductManagePage;
