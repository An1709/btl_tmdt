import { useEffect, useState } from "react";
import { couponService } from "@/services/couponService";
import type { Coupon } from "@/types/coupon";
import DataTable, { type Column } from "@/components/features/admin/DataTable";
import { formatCurrency, formatDate } from "@/utils/format";
import { toast } from "sonner";

const CouponManagePage = () => {
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        couponService.getAllCoupons().then(setCoupons).catch(console.error).finally(() => setLoading(false));
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm("Xóa mã giảm giá này?")) return;
        try {
            await couponService.deleteCoupon(id);
            setCoupons((prev) => prev.filter((c) => c._id !== id));
            toast.success("Đã xóa mã giảm giá.");
        } catch { toast.error("Không thể xóa."); }
    };




    const columns: Column<Coupon>[] = [
        { key: "code", header: "Mã", render: (c) => <span className="font-mono font-bold text-foreground">{c.code}</span> },
        {
            key: "discount", header: "Giảm giá", render: (c) => (
                <span className="font-bold text-[var(--pet-coral)]">
                    {c.discountType === "percent" ? `${c.value}%` : formatCurrency(c.value)}
                </span>
            )
        },
        { key: "min", header: "Đơn tối thiểu", render: (c) => formatCurrency(c.minOrderValue) },
        { key: "used", header: "Đã dùng", render: (c) => `${c.usedCount}/${c.usageLimit}` },
        { key: "expires", header: "Hết hạn", render: (c) => formatDate(c.expirationDate) },
        {
            key: "status", header: "Trạng thái", render: (c) => (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.usageLimit > 0 && c.usedCount < c.usageLimit ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
                    {c.usageLimit > 0 && c.usedCount < c.usageLimit ? "Còn lượt" : "Hết lượt"}
                </span>
            )
        },
    ];

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="section-title">🎟️ Mã Giảm Giá</h1>
                <button className="btn-pet-primary">+ Tạo mã mới</button>
            </div>
            <DataTable columns={columns} data={coupons} keyExtractor={(c) => c._id} isLoading={loading} emptyText="Chưa có mã giảm giá nào."
                actions={(c) => <button onClick={() => handleDelete(c._id)} className="text-xs px-3 py-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all font-semibold">Xóa</button>}
            />
        </div>
    );
};

export default CouponManagePage;