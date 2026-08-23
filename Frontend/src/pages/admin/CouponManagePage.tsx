import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { couponService, type CouponPayload } from "@/services/couponService";
import type { Coupon } from "@/types/coupon";
import DataTable, { DataTableActionGroup, DataTableConfirmAction, type Column } from "@/components/features/admin/DataTable";
import { AdminPageHeader } from "@/components/features/admin/AdminSurface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
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
    if (expired) return { label: "Hết hạn", tone: "error" as const };
    if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
        return { label: "Hết lượt", tone: "warning" as const };
    }
    return { label: "Đang hoạt động", tone: "success" as const };
};

const CouponManagePage = () => {
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [formOpen, setFormOpen] = useState(false);
    const [showValidation, setShowValidation] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
    const [form, setForm] = useState<CouponFormState>(emptyForm);

    const loadCoupons = useCallback(() => {
        setLoading(true);
        setLoadError(null);
        couponService.getAllCoupons(50)
            .then(setCoupons)
            .catch(() => setLoadError("Không thể tải danh sách mã giảm giá. Vui lòng thử lại."))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        loadCoupons();
    }, [loadCoupons]);

    const openCreateForm = () => {
        setEditingCoupon(null);
        setForm(emptyForm);
        setShowValidation(false);
        setFormOpen(true);
    };

    const openEditForm = (coupon: Coupon) => {
        setEditingCoupon(coupon);
        setShowValidation(false);
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
        setShowValidation(false);
    };

    const handleDelete = async (id: string) => {
        try {
            await couponService.deleteCoupon(id);
            setCoupons((prev) => prev.filter((c) => c._id !== id));
            toast.success("Đã xóa mã giảm giá.");
            return true;
        } catch {
            toast.error("Không thể xóa.");
            return false;
        }
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const payload = buildPayload(form);
        const validationError = validateForm(payload);

        if (validationError) {
            setShowValidation(true);
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

    const payloadPreview = buildPayload(form);
    const fieldErrors = showValidation ? {
        code: !payloadPreview.code ? "Vui lòng nhập mã giảm giá." : undefined,
        discountValue: !Number.isFinite(payloadPreview.discountValue) || payloadPreview.discountValue <= 0
            ? "Giá trị giảm phải lớn hơn 0."
            : payloadPreview.discountType === "percent" && payloadPreview.discountValue > 100
                ? "Giá trị giảm theo phần trăm phải nhỏ hơn hoặc bằng 100."
                : undefined,
        minOrderValue: !Number.isFinite(payloadPreview.minOrderValue) || payloadPreview.minOrderValue < 0 ? "Đơn tối thiểu phải lớn hơn hoặc bằng 0." : undefined,
        usageLimit: !Number.isFinite(payloadPreview.usageLimit) || payloadPreview.usageLimit < 0 ? "Giới hạn lượt dùng phải lớn hơn hoặc bằng 0." : undefined,
        endDate: !payloadPreview.endDate ? "Vui lòng chọn ngày kết thúc." : undefined,
    } : {};

    const columns: Column<Coupon>[] = useMemo(() => [
        { key: "code", header: "Mã", render: (c) => <span className="font-mono font-bold text-foreground">{c.code}</span> },
        {
            key: "discount",
            header: "Giảm giá",
            render: (c) => (
                <span className="font-semibold text-primary">
                    {c.discountType === "percent" ? `${c.discountValue ?? c.value}%` : formatCurrency(c.discountValue ?? c.value)}
                </span>
            ),
        },
        { key: "min", header: "Đơn tối thiểu", hideOnMobile: true, render: (c) => formatCurrency(c.minOrderValue) },
        { key: "used", header: "Đã dùng", render: (c) => `${c.usedCount}/${c.usageLimit > 0 ? c.usageLimit : "Không giới hạn"}` },
        { key: "expires", header: "Hết hạn", hideOnMobile: true, render: (c) => formatDate(c.expirationDate) },
        {
            key: "status",
            header: "Trạng thái",
            render: (c) => {
                const status = getCouponStatus(c);
                return (
                    <Badge tone={status.tone}>{status.label}</Badge>
                );
            },
        },
    ], []);

    return (
        <div className="flex flex-col gap-6">
            <AdminPageHeader
                title="Mã giảm giá"
                description="Quản lý giá trị, điều kiện áp dụng, giới hạn sử dụng và thời hạn theo các quy tắc coupon hiện có."
                actions={<Button type="button" onClick={openCreateForm}><Plus aria-hidden="true" />Thêm mã giảm giá</Button>}
            />

            <DataTable
                columns={columns}
                data={coupons}
                keyExtractor={(c) => c._id}
                isLoading={loading}
                error={loadError ? { description: loadError, action: <Button type="button" variant="outline" size="sm" onClick={() => loadCoupons()}>Thử lại</Button> } : null}
                emptyTitle="Chưa có mã giảm giá"
                emptyText="Tạo mã giảm giá đầu tiên để dùng trong bước thanh toán."
                tableLabel="Danh sách mã giảm giá"
                actions={(coupon) => <DataTableActionGroup><Button type="button" variant="outline" size="sm" onClick={() => openEditForm(coupon)}>Sửa</Button><DataTableConfirmAction label="Xóa" title="Xóa mã giảm giá" description={`Bạn sắp xóa mã “${coupon.code}”. Mã này sẽ không còn xuất hiện trong danh sách.`} confirmLabel="Xóa mã" onConfirm={() => handleDelete(coupon._id)} /></DataTableActionGroup>}
            />

            <Dialog
                open={formOpen}
                onOpenChange={(nextOpen) => { if (!nextOpen) closeForm(); }}
                title={editingCoupon ? "Chỉnh sửa mã giảm giá" : "Thêm mã giảm giá"}
                description="Mã vẫn được kiểm tra ở bước thanh toán theo thời hạn và giới hạn sử dụng hiện có."
                size="lg"
                closeOnBackdrop={!saving}
                closeOnEscape={!saving}
                footer={<DialogFooter><Button type="button" variant="outline" onClick={closeForm} disabled={saving}>Hủy</Button><Button type="submit" form="coupon-form" loading={saving}>{editingCoupon ? "Cập nhật mã" : "Tạo mã"}</Button></DialogFooter>}
            >
                <form id="coupon-form" className="grid grid-cols-1 gap-5 sm:grid-cols-2" onSubmit={handleSubmit}>
                    <FormField className="sm:col-span-2" label="Mã giảm giá" required error={fieldErrors.code} description="Mã được tự động chuyển thành chữ in hoa.">{(controlProps) => <Input {...controlProps} data-autofocus value={form.code} onChange={(event) => setForm((previous) => ({ ...previous, code: event.target.value.toUpperCase() }))} placeholder="WELCOME10" disabled={saving} />}</FormField>
                    <FormField label="Loại giảm giá" required>{(controlProps) => <Select {...controlProps} value={form.discountType} onChange={(event) => setForm((previous) => ({ ...previous, discountType: event.target.value as CouponFormState["discountType"] }))} disabled={saving}><option value="percent">Giảm theo phần trăm</option><option value="fixed">Giảm số tiền cố định</option></Select>}</FormField>
                    <FormField label="Giá trị giảm" required error={fieldErrors.discountValue} description={form.discountType === "percent" ? "Từ 0 đến 100%." : "Nhập số tiền lớn hơn 0."}>{(controlProps) => <Input {...controlProps} type="number" min="0" max={form.discountType === "percent" ? "100" : undefined} inputMode="decimal" value={form.discountValue} onChange={(event) => setForm((previous) => ({ ...previous, discountValue: event.target.value }))} disabled={saving} />}</FormField>
                    <FormField label="Đơn tối thiểu" required error={fieldErrors.minOrderValue} description="Nhập 0 nếu không áp dụng mức tối thiểu.">{(controlProps) => <Input {...controlProps} type="number" min="0" inputMode="decimal" value={form.minOrderValue} onChange={(event) => setForm((previous) => ({ ...previous, minOrderValue: event.target.value }))} disabled={saving} />}</FormField>
                    <FormField label="Giới hạn lượt dùng" required error={fieldErrors.usageLimit} description="Nhập 0 nếu không giới hạn lượt dùng.">{(controlProps) => <Input {...controlProps} type="number" min="0" step="1" inputMode="numeric" value={form.usageLimit} onChange={(event) => setForm((previous) => ({ ...previous, usageLimit: event.target.value }))} disabled={saving} />}</FormField>
                    <FormField label="Ngày kết thúc" required error={fieldErrors.endDate}>{(controlProps) => <Input {...controlProps} type="date" value={form.endDate} onChange={(event) => setForm((previous) => ({ ...previous, endDate: event.target.value }))} disabled={saving} />}</FormField>
                </form>
            </Dialog>
        </div>
    );
};

export default CouponManagePage;
