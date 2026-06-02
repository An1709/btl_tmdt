import { useState, useEffect, useCallback } from "react";
import DataTable, { type Column } from "@/components/features/admin/DataTable";
import { formatRelativeTime } from "@/utils/format";
import { toast } from "sonner";
import { adminReviewService, type AdminReview } from "@/services/adminReviewService";

const ReviewManagePage = () => {
    const [reviews, setReviews] = useState<AdminReview[]>([]);
    const [loading, setLoading] = useState(true);

    const loadReviews = useCallback(async () => {
        setLoading(true);
        try {
            const data = await adminReviewService.getAll();
            setReviews(data);
        } catch {
            toast.error("Không thể tải danh sách đánh giá.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadReviews();
    }, [loadReviews]);

    const handleDelete = async (id: string) => {
        if (!confirm("Bạn có chắc muốn xóa đánh giá này?")) return;
        try {
            await adminReviewService.delete(id);
            setReviews((prev) => prev.filter((r) => r._id !== id));
            toast.success("Đã xóa đánh giá vi phạm.");
        } catch {
            toast.error("Không thể xóa đánh giá. Vui lòng thử lại.");
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
            header: "⭐", 
            render: (r) => <span className="font-bold text-amber-500">{r.rating}/5</span> 
        },
        { 
            key: "comment", 
            header: "Bình luận", 
            render: (r) => <span className="text-foreground text-sm line-clamp-2 max-w-xs">{r.comment}</span> 
        },
        { 
            key: "time", 
            header: "Thời gian", 
            render: (r) => <span className="text-muted-foreground text-xs">{formatRelativeTime(r.createdAt)}</span> 
        },
    ];

    return (
        <div className="flex flex-col gap-6">
            <h1 className="section-title">⭐ Kiểm Duyệt Đánh Giá</h1>
            {loading ? (
                <div className="animate-pulse flex flex-col gap-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-14 bg-muted rounded-xl" />
                    ))}
                </div>
            ) : (
                <DataTable
                    columns={columns}
                    data={reviews}
                    keyExtractor={(r) => r._id}
                    emptyText="Không có đánh giá nào."
                    actions={(r) => (
                        <button 
                            onClick={() => handleDelete(r._id)} 
                            className="text-xs px-3 py-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all font-semibold"
                        >
                            Xóa spam
                        </button>
                    )}
                />
            )}
        </div>
    );
};

export default ReviewManagePage;