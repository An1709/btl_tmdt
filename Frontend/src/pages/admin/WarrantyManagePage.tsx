import { useEffect, useState } from "react";
import { warrantyService } from "@/services/warrantyService";
import type { WarrantyRequest, WarrantyStatus } from "@/types/warranty";
import DataTable, { type Column } from "@/components/features/admin/DataTable";
import { formatDate } from "@/utils/format";
import { WARRANTY_STATUS_LABELS } from "@/utils/constants";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    processing: "bg-blue-100 text-blue-700",
    resolved: "bg-emerald-100 text-emerald-700",
    rejected: "bg-red-100 text-red-600",
};

const WarrantyManagePage = () => {
    const [requests, setRequests] = useState<WarrantyRequest[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        warrantyService.getAllRequests().then(setRequests).catch(console.error).finally(() => setLoading(false));
    }, []);

    const handleStatus = async (id: string, status: WarrantyStatus) => {
        try {
            await warrantyService.updateStatus(id, status);
            setRequests((prev) => prev.map((r) => r._id === id ? { ...r, status } : r));
            toast.success("Cập nhật trạng thái thành công!");
        } catch { toast.error("Không thể cập nhật."); }
    };

    const columns: Column<WarrantyRequest>[] = [
        { key: "user", header: "Người dùng", render: (r) => <span className="text-sm font-semibold text-foreground">{r.username ?? r.userId}</span> },
        { key: "product", header: "Sản phẩm", render: (r) => <span className="text-sm text-muted-foreground">{r.productName}</span> },
        { key: "issue", header: "Vấn đề", render: (r) => <span className="text-sm text-foreground">{r.issue}</span> },
        { key: "date", header: "Ngày gửi", render: (r) => formatDate(r.createdAt) },
        {
            key: "status", header: "Trạng thái", render: (r) => (
                <select
                    value={r.status}
                    onChange={(e) => handleStatus(r._id, e.target.value as WarrantyStatus)}
                    className={`text-xs font-bold px-2 py-1 rounded-lg border-0 cursor-pointer ${STATUS_COLORS[r.status]}`}
                >
                    {Object.entries(WARRANTY_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
            )
        },
    ];

    return (
        <div className="flex flex-col gap-6">
            <h1 className="section-title">🛡️ Quản Lý Bảo Hành</h1>
            <DataTable columns={columns} data={requests} keyExtractor={(r) => r._id} isLoading={loading} emptyText="Không có yêu cầu bảo hành nào." />
        </div>
    );
};

export default WarrantyManagePage;