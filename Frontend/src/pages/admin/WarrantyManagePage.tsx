import { useCallback, useEffect, useMemo, useState } from "react";
import { warrantyService } from "@/services/warrantyService";
import type { WarrantyRequest, WarrantyStatus } from "@/types/warranty";
import DataTable, { type Column } from "@/components/features/admin/DataTable";
import { AdminPageHeader } from "@/components/features/admin/AdminSurface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { formatDate } from "@/utils/format";
import { WARRANTY_STATUS_LABELS } from "@/utils/constants";
import { toast } from "sonner";

const STATUS_TONES: Record<WarrantyStatus, "warning" | "info" | "success" | "error"> = {
    Pending: "warning",
    Approved: "info",
    Rejected: "error",
    Completed: "success",
};

const getReferenceId = (reference: string | { _id: string }) => typeof reference === "string" ? reference : reference._id;
const getUserLabel = (request: WarrantyRequest) => typeof request.user === "string"
    ? request.user
    : request.user.displayName || request.user.username || request.user.email || request.user._id;
const getProductLabel = (request: WarrantyRequest) => typeof request.product === "string"
    ? request.product
    : request.product.name || request.product._id;

const WarrantyManagePage = () => {
    const [requests, setRequests] = useState<WarrantyRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [pendingChange, setPendingChange] = useState<{ request: WarrantyRequest; status: WarrantyStatus } | null>(null);

    const loadRequests = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        try { setRequests(await warrantyService.getAllRequests()); }
        catch { setLoadError("Không thể tải danh sách yêu cầu bảo hành. Vui lòng thử lại."); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { void loadRequests(); }, [loadRequests]);

    const handleStatus = async (id: string, status: WarrantyStatus) => {
        try {
            setUpdatingId(id);
            await warrantyService.updateStatus(id, status);
            setRequests((prev) => prev.map((request) => request._id === id ? { ...request, status } : request));
            toast.success("Cập nhật trạng thái thành công!");
            setPendingChange(null);
        } catch { toast.error("Không thể cập nhật."); }
        finally { setUpdatingId(null); }
    };

    const columns: Column<WarrantyRequest>[] = useMemo(() => [
        { key: "user", header: "Người dùng", render: (request) => <div className="text-sm"><p className="font-semibold text-text-strong">{getUserLabel(request)}</p><p className="font-mono text-xs text-muted-foreground">Đơn #{getReferenceId(request.order).slice(-8).toUpperCase()}</p></div> },
        { key: "product", header: "Sản phẩm", render: (request) => <div className="max-w-56 text-sm"><p className="font-medium text-text-strong">{getProductLabel(request)}</p><p className="font-mono text-xs text-muted-foreground">{getReferenceId(request.product)}</p></div> },
        { key: "issue", header: "Vấn đề", render: (request) => <div className="max-w-sm text-sm"><p className="line-clamp-3 whitespace-pre-wrap font-medium text-text-strong">{request.reason}</p>{request.adminResponse && <p className="mt-1 line-clamp-2 text-muted-foreground">Phản hồi: {request.adminResponse}</p>}</div> },
        { key: "evidence", header: "Bằng chứng", hideOnMobile: true, render: (request) => request.images?.length > 0 ? <div className="flex items-center gap-2"><img src={request.images[0]} alt="Bằng chứng bảo hành" className="size-12 rounded-md border border-border object-cover" /><span className="text-xs text-muted-foreground">{request.images.length} ảnh</span></div> : <span className="text-xs text-muted-foreground">Không có ảnh</span> },
        { key: "date", header: "Ngày gửi", hideOnMobile: true, render: (request) => formatDate(request.createdAt) },
        {
            key: "status", header: "Trạng thái", render: (request) => <Badge tone={STATUS_TONES[request.status]}>{WARRANTY_STATUS_LABELS[request.status] ?? request.status}</Badge>
        },
    ], []);

    return (
        <div className="flex flex-col gap-6">
            <AdminPageHeader title="Quản lý bảo hành" description="Xem đơn hàng, sản phẩm, mô tả và bằng chứng trước khi thay đổi trạng thái xử lý." />
            <DataTable columns={columns} data={requests} keyExtractor={(request) => request._id} isLoading={loading} error={loadError ? { description: loadError, action: <Button type="button" variant="outline" size="sm" onClick={() => void loadRequests()}>Thử lại</Button> } : null} emptyTitle="Chưa có yêu cầu bảo hành" emptyText="Yêu cầu mới từ khách hàng sẽ xuất hiện tại đây." tableLabel="Danh sách yêu cầu bảo hành" actions={(request) => <Select value={request.status} onChange={(event) => setPendingChange({ request, status: event.target.value as WarrantyStatus })} disabled={updatingId === request._id} className="h-9 min-w-40 text-sm" aria-label={`Cập nhật trạng thái bảo hành cho ${getProductLabel(request)}`}>{Object.entries(WARRANTY_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select>} />
            <Dialog open={Boolean(pendingChange)} onOpenChange={(open) => { if (!open && !updatingId) setPendingChange(null); }} title="Cập nhật trạng thái bảo hành" description={pendingChange ? getProductLabel(pendingChange.request) : undefined} size="sm" closeOnBackdrop={!updatingId} closeOnEscape={!updatingId} footer={<DialogFooter><Button type="button" variant="outline" disabled={Boolean(updatingId)} onClick={() => setPendingChange(null)}>Hủy</Button><Button type="button" loading={Boolean(updatingId)} variant={pendingChange?.status === "Rejected" ? "destructive" : "default"} onClick={() => { if (pendingChange) void handleStatus(pendingChange.request._id, pendingChange.status); }}>Xác nhận cập nhật</Button></DialogFooter>}>
                {pendingChange && <div className="space-y-3 text-sm leading-6"><p>Chuyển từ <strong>{WARRANTY_STATUS_LABELS[pendingChange.request.status]}</strong> sang <strong>{WARRANTY_STATUS_LABELS[pendingChange.status]}</strong>.</p><div className="rounded-md bg-surface-subtle p-3"><p className="whitespace-pre-wrap font-medium text-text-strong">{pendingChange.request.reason}</p></div></div>}
            </Dialog>
        </div>
    );
};

export default WarrantyManagePage;
