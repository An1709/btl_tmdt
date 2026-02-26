import { useState } from "react";
import DataTable, { type Column } from "@/components/features/admin/DataTable";
import { formatRelativeTime } from "@/utils/format";
import { toast } from "sonner";

interface AdminReview {
    _id: string;
    productName: string;
    userName: string;
    rating: number;
    comment: string;
    createdAt: string;
}

const MOCK_REVIEWS: AdminReview[] = [
    { _id: "r1", productName: "Golden Retriever", userName: "Nguyen Van A", rating: 5, comment: "Bé rất dễ thương và khỏe mạnh!", createdAt: new Date().toISOString() },
    { _id: "r2", productName: "Thức Ăn Royal Canin", userName: "Tran Thi B", rating: 2, comment: "Spam spam mua hang di", createdAt: new Date(Date.now() - 86400000).toISOString() },
    { _id: "r3", productName: "Vòng Cổ Cho Chó", userName: "Le Minh C", rating: 4, comment: "Sản phẩm đẹp, giao hàng nhanh.", createdAt: new Date(Date.now() - 172800000).toISOString() },
];

const ReviewManagePage = () => {
    const [reviews, setReviews] = useState<AdminReview[]>(MOCK_REVIEWS);

    const handleDelete = (id: string) => {
        setReviews((prev) => prev.filter((r) => r._id !== id));
        toast.success("Đã xóa đánh giá.");
    };

    const columns: Column<AdminReview>[] = [
        { key: "product", header: "Sản phẩm", render: (r) => <span className="font-semibold text-sm text-foreground">{r.productName}</span> },
        { key: "user", header: "Người dùng", render: (r) => <span className="text-muted-foreground text-sm">{r.userName}</span> },
        { key: "rating", header: "⭐", render: (r) => <span className="font-bold text-amber-500">{r.rating}/5</span> },
        { key: "comment", header: "Bình luận", render: (r) => <span className="text-foreground text-sm line-clamp-2 max-w-xs">{r.comment}</span> },
        { key: "time", header: "Thời gian", render: (r) => <span className="text-muted-foreground text-xs">{formatRelativeTime(r.createdAt)}</span> },
    ];

    return (
        <div className="flex flex-col gap-6">
            <h1 className="section-title">⭐ Kiểm Duyệt Đánh Giá</h1>
            <DataTable
                columns={columns}
                data={reviews}
                keyExtractor={(r) => r._id}
                emptyText="Không có đánh giá nào."
                actions={(r) => <button onClick={() => handleDelete(r._id)} className="text-xs px-3 py-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all font-semibold">Xóa spam</button>}
            />
        </div>
    );
};

export default ReviewManagePage;