import { useState, useEffect, useCallback } from "react";
import DataTable, { DataTableConfirmAction, type Column } from "@/components/features/admin/DataTable";
import { AdminPageHeader } from "@/components/features/admin/AdminSurface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/utils/format";
import { toast } from "sonner";
import { adminReviewService, type AdminReview } from "@/services/adminReviewService";

const ReviewManagePage = () => {
    const [reviews, setReviews] = useState<AdminReview[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const loadReviews = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        try {
            const data = await adminReviewService.getAll();
            setReviews(data);
        } catch {
            setLoadError("Không thể tải danh sách đánh giá. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadReviews();
    }, [loadReviews]);

    const handleDelete = async (id: string) => {
        try {
            await adminReviewService.delete(id);
            setReviews((prev) => prev.filter((r) => r._id !== id));
            toast.success("Đã xóa đánh giá vi phạm.");
            return true;
        } catch {
            toast.error("Không thể xóa đánh giá. Vui lòng thử lại.");
            return false;
        }
    };

    const columns: Column<AdminReview>[] = [
        { 
            key: "product", 
            header: "Sản phẩm", 
            render: (r) => <span className="font-semibold text-sm text-foreground">{r.product?.name || "Sản phẩm đã xóa"}</span> 
        },
        { 
            key: "user", 
            header: "Người dùng", 
            render: (r) => <span className="text-muted-foreground text-sm font-medium">{r.user?.displayName || r.user?.username || r.user?.email || "Người dùng"}</span> 
        },
        { 
            key: "rating", 
            header: "Đánh giá",
            render: (r) => <Badge tone="warning" aria-label={`${r.rating} trên 5 sao`}>{r.rating}/5 sao</Badge>
        },
        { 
            key: "comment", 
            header: "Bình luận", 
            render: (r) => <span className="block max-w-md whitespace-pre-wrap text-sm leading-6 text-foreground">{r.comment || "Không có nội dung"}</span>
        },
        { 
            key: "time", 
            header: "Thời gian", 
            render: (r) => <span className="text-muted-foreground text-xs">{formatRelativeTime(r.createdAt)}</span> 
        },
    ];

    return (
        <div className="flex flex-col gap-6">
            <AdminPageHeader title="Kiểm duyệt đánh giá" description="Đọc đầy đủ ngữ cảnh sản phẩm, người dùng và nội dung trước khi xóa đánh giá." />
            <DataTable
                columns={columns}
                data={reviews}
                keyExtractor={(review) => review._id}
                isLoading={loading}
                error={loadError ? { description: loadError, action: <Button type="button" variant="outline" size="sm" onClick={() => void loadReviews()}>Thử lại</Button> } : null}
                emptyTitle="Chưa có đánh giá"
                emptyText="Các đánh giá mới sẽ xuất hiện tại đây để kiểm duyệt."
                tableLabel="Danh sách đánh giá quản trị"
                actions={(review) => <DataTableConfirmAction label="Xóa" title="Xóa đánh giá" description={`Xóa đánh giá ${review.rating}/5 sao của ${review.user?.displayName || review.user?.username || review.user?.email || "người dùng"}? Hành động này không thể hoàn tác.`} confirmLabel="Xóa đánh giá" onConfirm={() => handleDelete(review._id)} />}
            />
        </div>
    );
};

export default ReviewManagePage;
