import { useEffect, useMemo, useState, type FormEvent } from "react";
import { couponService, type CouponPayload } from "@/services/couponService";
import type { Coupon } from "@/types/coupon";
import DataTable, { type Column } from "@/components/features/admin/DataTable";
import { formatCurrency, formatDate } from "@/utils/format";
import { toast } from "sonner";

interface CouponFormState {
    code: string;
    discountType: "percent" | "fixed";
    discountValue: string;
    minOrderValue: string;
    usageLimit: string;
    endDate: string;
}

const emptyForm: CouponFormState = {
    code: "",
    discountType: "percent",
    discountValue: "",
    minOrderValue: "0",
    usageLimit: "100",
    endDate: "",
};

const toInputDate = (value?: string) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString().slice(0, 10);
};

const getErrorMessage = (error: unknown) =>
    (error as { response?: { data?: { message?: string } } }).response?.data?.message
    || "Không thể lưu mã giảm giá. Vui lòng thử lại.";

const buildPayload = (form: CouponFormState): CouponPayload => ({
    code: form.code.trim().toUpperCase(),
    discountType: form.discountType,
    discountValue: Number(form.discountValue),
    minOrderValue: Number(form.minOrderValue || 0),
    usageLimit: Number(form.usageLimit || 0),
    endDate: form.endDate,
});

const validateForm = (payload: CouponPayload) => {
    if (!payload.code) return "Vui lòng nhập mã giảm giá.";
    if (!["percent", "fixed"].includes(payload.discountType)) return "Loại giảm giá không hợp lệ.";
    if (!Number.isFinite(payload.discountValue) || payload.discountValue <= 0) return "Giá trị giảm phải lớn hơn 0.";
    if (payload.discountType === "percent" && payload.discountValue > 100) return "Giá trị giảm theo phần trăm phải nhỏ hơn hoặc bằng 100.";
    if (!Number.isFinite(payload.minOrderValue) || payload.minOrderValue < 0) return "Đơn tối thiểu phải lớn hơn hoặc bằng 0.";
    if (!Number.isFinite(payload.usageLimit) || payload.usageLimit < 0) return "Giới hạn lượt dùng phải lớn hơn hoặc bằng 0.";
    if (!payload.endDate) return "Vui lòng chọn ngày kết thúc.";
    return "";
};

const getCouponStatus = (coupon: Coupon) => {
    const expired = new Date(coupon.expirationDate).getTime() < Date.now();
    if (expired) return { label: "Hết hạn", className: "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-300" };
    if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
        return { label: "Hết lượt", className: "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300" };
    }
    return { label: "Đang hoạt động", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" };
};

const CouponManagePage = () => {
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formOpen, setFormOpen] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
    const [form, setForm] = useState<CouponFormState>(emptyForm);

    const loadCoupons = () => {
        setLoading(true);
        couponService.getAllCoupons()
            .then(setCoupons)
            .catch(() => toast.error("Không thể tải danh sách mã giảm giá. Vui lòng thử lại."))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadCoupons();
    }, []);

    const openCreateForm = () => {
        setEditingCoupon(null);
        setForm(emptyForm);
        setFormOpen(true);
    };

    const openEditForm = (coupon: Coupon) => {
        setEditingCoupon(coupon);
        setForm({
            code: coupon.code,
            discountType: coupon.discountType,
            discountValue: String(coupon.discountValue ?? coupon.value ?? ""),
            minOrderValue: String(coupon.minOrderValue ?? 0),
            usageLimit: String(coupon.usageLimit ?? 0),
            endDate: toInputDate(coupon.endDate ?? coupon.expirationDate),
        });
        setFormOpen(true);
    };

    const closeForm = () => {
        if (saving) return;
        setFormOpen(false);
        setEditingCoupon(null);
        setForm(emptyForm);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Xóa mã giảm giá này?")) return;
        try {
            await couponService.deleteCoupon(id);
            setCoupons((prev) => prev.filter((c) => c._id !== id));
            toast.success("Đã xóa mã giảm giá.");
        } catch {
            toast.error("Không thể xóa.");
        }
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const payload = buildPayload(form);
        const validationError = validateForm(payload);

        if (validationError) {
            toast.error(validationError);
            return;
        }

        setSaving(true);

        try {
            const savedCoupon = editingCoupon
                ? await couponService.updateCoupon(editingCoupon._id, payload)
                : await couponService.createCoupon(payload);

            setCoupons((prev) => {
                if (!editingCoupon) return [savedCoupon, ...prev];
                return prev.map((coupon) => coupon._id === savedCoupon._id ? savedCoupon : coupon);
            });
            toast.success(editingCoupon ? "Cập nhật mã giảm giá thành công." : "Tạo mã giảm giá thành công.");
            setFormOpen(false);
            setEditingCoupon(null);
            setForm(emptyForm);
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setSaving(false);
        }
    };

    const columns: Column<Coupon>[] = useMemo(() => [
        { key: "code", header: "Mã", render: (c) => <span className="font-mono font-bold text-foreground">{c.code}</span> },
        {
            key: "discount",
            header: "Giảm giá",
            render: (c) => (
                <span className="font-bold text-[var(--pet-coral)]">
                    {c.discountType === "percent" ? `${c.discountValue ?? c.value}%` : formatCurrency(c.discountValue ?? c.value)}
                </span>
            ),
        },
        { key: "min", header: "Đơn tối thiểu", render: (c) => formatCurrency(c.minOrderValue) },
        { key: "used", header: "Đã dùng", render: (c) => `${c.usedCount}/${c.usageLimit > 0 ? c.usageLimit : "Không giới hạn"}` },
        { key: "expires", header: "Hết hạn", render: (c) => formatDate(c.expirationDate) },
        {
            key: "status",
            header: "Trạng thái",
            render: (c) => {
                const status = getCouponStatus(c);
                return (
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap ${status.className}`}>
                        {status.label}
                    </span>
                );
            },
        },
    ], []);

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="section-title">🎟️ Mã Giảm Giá</h1>
                <button type="button" onClick={openCreateForm} className="btn-pet-primary">
                    + Thêm mã giảm giá
                </button>
            </div>

            <DataTable
                columns={columns}
                data={coupons}
                keyExtractor={(c) => c._id}
                isLoading={loading}
                emptyText="Chưa có mã giảm giá nào."
                actions={(c) => (
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => openEditForm(c)}
                            className="text-xs px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all font-semibold"
                        >
                            Sửa
                        </button>
                        <button
                            type="button"
                            onClick={() => handleDelete(c._id)}
                            className="text-xs px-3 py-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all font-semibold"
                        >
                            Xóa
                        </button>
                    </div>
                )}
            />

            {formOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
                    <div className="w-full max-w-xl rounded-2xl border border-border bg-white dark:bg-card p-5 shadow-2xl">
                        <div className="flex items-start justify-between gap-4 mb-5">
                            <div>
                                <h2 className="font-black text-xl text-foreground" style={{ fontFamily: "'Nunito', sans-serif" }}>
                                    {editingCoupon ? "Chỉnh sửa mã giảm giá" : "Thêm mã giảm giá"}
                                </h2>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Mã sẽ được dùng trong bước thanh toán nếu còn hạn và còn lượt dùng.
                                </p>
                            </div>
                            <button type="button" onClick={closeForm} className="text-muted-foreground hover:text-foreground text-xl leading-none">
                                ×
                            </button>
                        </div>

                        <form className="grid grid-cols-1 sm:grid-cols-2 gap-4" onSubmit={handleSubmit}>
                            <label className="flex flex-col gap-1.5 sm:col-span-2">
                                <span className="text-sm font-semibold text-foreground">Mã</span>
                                <input
                                    value={form.code}
                                    onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))}
                                    className="px-4 py-3 rounded-xl border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pet-coral)]/40"
                                    placeholder="NEWMEMBER"
                                    disabled={saving}
                                />
                            </label>

                            <label className="flex flex-col gap-1.5">
                                <span className="text-sm font-semibold text-foreground">Loại giảm giá</span>
                                <select
                                    value={form.discountType}
                                    onChange={(event) => setForm((prev) => ({ ...prev, discountType: event.target.value as CouponFormState["discountType"] }))}
                                    className="px-4 py-3 rounded-xl border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pet-coral)]/40"
                                    disabled={saving}
                                >
                                    <option value="percent">Giảm theo phần trăm</option>
                                    <option value="fixed">Giảm số tiền cố định</option>
                                </select>
                            </label>

                            <label className="flex flex-col gap-1.5">
                                <span className="text-sm font-semibold text-foreground">Giá trị giảm</span>
                                <input
                                    type="number"
                                    min="0"
                                    value={form.discountValue}
                                    onChange={(event) => setForm((prev) => ({ ...prev, discountValue: event.target.value }))}
                                    className="px-4 py-3 rounded-xl border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pet-coral)]/40"
                                    disabled={saving}
                                />
                            </label>

                            <label className="flex flex-col gap-1.5">
                                <span className="text-sm font-semibold text-foreground">Đơn tối thiểu</span>
                                <input
                                    type="number"
                                    min="0"
                                    value={form.minOrderValue}
                                    onChange={(event) => setForm((prev) => ({ ...prev, minOrderValue: event.target.value }))}
                                    className="px-4 py-3 rounded-xl border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pet-coral)]/40"
                                    disabled={saving}
                                />
                            </label>

                            <label className="flex flex-col gap-1.5">
                                <span className="text-sm font-semibold text-foreground">Giới hạn lượt dùng</span>
                                <input
                                    type="number"
                                    min="0"
                                    value={form.usageLimit}
                                    onChange={(event) => setForm((prev) => ({ ...prev, usageLimit: event.target.value }))}
                                    className="px-4 py-3 rounded-xl border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pet-coral)]/40"
                                    disabled={saving}
                                />
                            </label>

                            <label className="flex flex-col gap-1.5 sm:col-span-2">
                                <span className="text-sm font-semibold text-foreground">Ngày kết thúc</span>
                                <input
                                    type="date"
                                    value={form.endDate}
                                    onChange={(event) => setForm((prev) => ({ ...prev, endDate: event.target.value }))}
                                    className="px-4 py-3 rounded-xl border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pet-coral)]/40"
                                    disabled={saving}
                                />
                            </label>

                            <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
                                <button type="button" onClick={closeForm} disabled={saving} className="btn-pet-secondary">
                                    Hủy
                                </button>
                                <button type="submit" disabled={saving} className="btn-pet-primary">
                                    {saving ? "Đang lưu..." : "Lưu"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CouponManagePage;
