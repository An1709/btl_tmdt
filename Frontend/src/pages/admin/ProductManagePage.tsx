import { useState, useEffect, useCallback, useMemo, type FormEvent } from "react";
import { Plus, Search } from "lucide-react";
import { productService, type ProductPayload } from "@/services/productService";
import { categoryService, type DbCategory } from "@/services/categoryService";
import type { Product } from "@/types/product";
import DataTable, { DataTableActionGroup, DataTableConfirmAction, type Column } from "@/components/features/admin/DataTable";
import { AdminPageHeader, AdminPanel } from "@/components/features/admin/AdminSurface";
import Pagination from "@/components/common/Pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
    const [loadError, setLoadError] = useState<string | null>(null);
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
        setLoadError(null);
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
            setLoadError("Không thể tải danh sách sản phẩm. Vui lòng thử lại.");
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

    const categoryLabel = useCallback((product: Product) => {
        const match = categories.find(
            (category) => category._id === product.categoryId || category.slug === product.category || category.name === product.category,
        );
        return match?.name ?? product.category;
    }, [categories]);

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
        if (saving) return;
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

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const payload = buildPayload();
        if (!payload) return;

        try {
            setSaving(true);
            if (editingProduct) {
                await productService.update(editingProduct.id, payload);
                toast.success("Đã cập nhật sản phẩm.");
                await loadProducts();
            } else {
                await productService.create(payload);
                toast.success("Đã thêm sản phẩm.");
                const queryWillReset = page !== 1 || searchTerm !== "";
                setPage(1);
                setSearchTerm("");
                setSearchQuery("");
                if (!queryWillReset) await loadProducts();
            }
            setFormOpen(false);
            setEditingProduct(null);
            setForm(emptyForm);
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
        try {
            await productService.delete(id);
            toast.success("Đã xóa sản phẩm.");
            await loadProducts();
            return true;
        } catch {
            toast.error("Xóa thất bại. Vui lòng thử lại.");
            return false;
        }
    };

    const stockError = form.stock.trim() !== "" && (!Number.isInteger(Number(form.stock)) || Number(form.stock) < 0)
        ? "Tồn kho phải là số nguyên không âm."
        : undefined;
    const priceError = form.price.trim() !== "" && (!Number.isFinite(Number(form.price)) || Number(form.price) < 0)
        ? "Giá sản phẩm không hợp lệ."
        : undefined;
    const firstImage = form.image.split(",").map((image) => image.trim()).find(Boolean);

    const columns: Column<Product>[] = useMemo(() => [
        {
            key: "product", header: "Sản phẩm", render: (p) => (
                <div className="flex min-w-56 items-center gap-3">
                    <img src={p.image || IMAGE_ASSETS.placeholder} alt="" className="size-11 rounded-md border border-border object-cover" />
                    <div className="min-w-0">
                        <p className="line-clamp-1 text-sm font-semibold text-text-strong">{p.name}</p>
                        {p.breed && <p className="line-clamp-1 text-xs text-muted-foreground">{p.breed}</p>}
                    </div>
                </div>
            )
        },
        { key: "category", header: "Danh mục", render: (p) => <Badge tone="neutral" className="capitalize">{categoryLabel(p)}</Badge> },
        { key: "price", header: "Giá", render: (p) => <span className="font-semibold text-primary">{formatCurrency(p.price)}</span> },
        { key: "rating", header: "Đánh giá", hideOnMobile: true, render: (p) => <span>{p.rating.toFixed(1)} ({p.reviewCount})</span> },
        {
            key: "stock", header: "Tồn kho", render: (p) => <Badge tone={p.inStock ? "success" : "error"}>{p.stock ?? 0} · {p.inStock ? "Còn hàng" : "Hết hàng"}</Badge>
        },
    ], [categoryLabel]);

    const runSearch = () => {
        setSearchTerm(searchQuery.trim());
        setPage(1);
    };

    return (
        <div className="flex flex-col gap-6">
            <AdminPageHeader
                title={`Quản lý sản phẩm${loading ? "" : ` (${totalProducts})`}`}
                description="Theo dõi danh mục, giá và tồn kho; các thay đổi được áp dụng theo dữ liệu sản phẩm hiện có."
                actions={<Button type="button" onClick={openCreateForm}><Plus aria-hidden="true" />Thêm sản phẩm</Button>}
            />

            <AdminPanel title="Tìm sản phẩm" description="Tìm theo tên để giữ nguyên kết quả và phân trang hiện tại.">
                <div className="flex w-full flex-col gap-2 sm:max-w-xl sm:flex-row">
                    <Input
                        type="search"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        onKeyDown={(event) => { if (event.key === "Enter") runSearch(); }}
                        placeholder="Tìm kiếm sản phẩm theo tên"
                        aria-label="Tìm kiếm sản phẩm theo tên"
                    />
                    <Button type="button" variant="outline" onClick={runSearch}><Search aria-hidden="true" />Tìm</Button>
                </div>
            </AdminPanel>

            {formOpen && (
                <AdminPanel
                    title={editingProduct ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm"}
                    description="Các trường có dấu * là bắt buộc. Giá và tồn kho tiếp tục dùng cùng các quy tắc xác thực hiện có."
                    action={<Button type="button" variant="ghost" size="sm" onClick={closeForm} disabled={saving}>Đóng</Button>}
                >
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <FormField label="Tên sản phẩm" required>{(controlProps) => <Input {...controlProps} data-autofocus value={form.name} onChange={(event) => setForm((previous) => ({ ...previous, name: event.target.value }))} disabled={saving} />}</FormField>
                        <FormField label="Danh mục" required>{(controlProps) => <Select {...controlProps} value={form.category} onChange={(event) => setForm((previous) => ({ ...previous, category: event.target.value }))} disabled={saving}><option value="">Chọn danh mục</option>{categories.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}</Select>}</FormField>
                        <FormField label="Giá" required error={priceError} description="Nhập giá trị từ 0 trở lên.">{(controlProps) => <Input {...controlProps} type="number" min="0" inputMode="decimal" value={form.price} onChange={(event) => setForm((previous) => ({ ...previous, price: event.target.value }))} disabled={saving} />}</FormField>
                        <FormField label="Tồn kho" required error={stockError} description="Chỉ chấp nhận số nguyên từ 0 trở lên.">{(controlProps) => <Input {...controlProps} type="number" min="0" step="1" inputMode="numeric" value={form.stock} onChange={(event) => setForm((previous) => ({ ...previous, stock: event.target.value }))} disabled={saving} />}</FormField>
                        <FormField label="Giống">{(controlProps) => <Input {...controlProps} value={form.breed} onChange={(event) => setForm((previous) => ({ ...previous, breed: event.target.value }))} disabled={saving} />}</FormField>
                        <FormField label="Tuổi">{(controlProps) => <Input {...controlProps} value={form.age} onChange={(event) => setForm((previous) => ({ ...previous, age: event.target.value }))} disabled={saving} />}</FormField>
                        <FormField className="md:col-span-2" label="URL ảnh" description="Có thể nhập nhiều URL, cách nhau bằng dấu phẩy; danh sách ảnh hiện tại vẫn được gửi theo đúng payload cũ.">{(controlProps) => <Input {...controlProps} value={form.image} onChange={(event) => setForm((previous) => ({ ...previous, image: event.target.value }))} placeholder="https://…" disabled={saving} />}</FormField>
                        {firstImage && <img src={firstImage} alt="Xem trước ảnh sản phẩm" className="h-40 w-40 rounded-md border border-border object-cover" />}
                        <FormField className="md:col-span-2" label="Mô tả" required>{(controlProps) => <Textarea {...controlProps} rows={5} value={form.description} onChange={(event) => setForm((previous) => ({ ...previous, description: event.target.value }))} disabled={saving} />}</FormField>
                        <div className="flex flex-col-reverse justify-end gap-2 border-t border-divider pt-5 sm:col-span-2 sm:flex-row"><Button type="button" variant="outline" onClick={closeForm} disabled={saving}>Hủy</Button><Button type="submit" loading={saving}>{editingProduct ? "Cập nhật sản phẩm" : "Tạo sản phẩm"}</Button></div>
                    </form>
                </AdminPanel>
            )}

            <DataTable
                columns={columns}
                data={products}
                keyExtractor={(product) => product.id}
                isLoading={loading}
                error={loadError ? { description: loadError, action: <Button type="button" variant="outline" size="sm" onClick={() => void loadProducts()}>Thử lại</Button> } : null}
                emptyTitle="Chưa có sản phẩm"
                emptyText="Thêm sản phẩm đầu tiên hoặc điều chỉnh cụm từ tìm kiếm."
                tableLabel="Danh sách sản phẩm"
                actions={(product) => <DataTableActionGroup><Button type="button" variant="outline" size="sm" onClick={() => openEditForm(product)}>Sửa</Button><DataTableConfirmAction label="Xóa" title="Xóa sản phẩm" description={`Bạn sắp xóa “${product.name}”. Hành động này không thể hoàn tác.`} confirmLabel="Xóa sản phẩm" onConfirm={() => handleDelete(product.id)} /></DataTableActionGroup>}
            />
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </div>
    );
};

export default ProductManagePage;
