import { useState } from "react";
import { productService } from "@/services/productService";
import { useAuthStore } from "@/stores/useAuthStore";
import { toast } from "sonner";
import { Link } from "react-router";

interface Review {
    _id: string;
    userId: { displayName: string; avatarUrl?: string };
    rating: number;
    comment: string;
    createdAt: string;
}

interface ProductReviewsProps {
    productId: string;
    reviews?: Review[];
    averageRating?: number;
    onReviewAdded?: () => void;
}

const StarPicker = ({ rating, onChange }: { rating: number; onChange: (r: number) => void }) => {
    const [hover, setHover] = useState(0);
    return (
        <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
                <button
                    key={s}
                    type="button"
                    onMouseEnter={() => setHover(s)}
                    onMouseLeave={() => setHover(0)}
                    onClick={() => onChange(s)}
                    className="text-2xl transition-transform hover:scale-110"
                >
                    {s <= (hover || rating) ? "⭐" : "☆"}
                </button>
            ))}
        </div>
    );
};

const ProductReviews = ({
    productId,
    reviews = [],
    averageRating = 0,
    onReviewAdded,
}: ProductReviewsProps) => {
    const { user } = useAuthStore();
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!comment.trim()) return;
        setSubmitting(true);
        try {
            await productService.submitReview(productId, { rating, comment: comment.trim() });
            toast.success("Cảm ơn đánh giá của bạn!");
            setComment("");
            setRating(5);
            onReviewAdded?.();
        } catch {
            toast.error("Không thể gửi đánh giá. Vui lòng thử lại.");
        } finally {
            setSubmitting(false);
        }
    };

    // Rating breakdown
    const breakdown = [5, 4, 3, 2, 1].map((star) => ({
        star,
        count: reviews.filter((r) => r.rating === star).length,
        pct: reviews.length ? (reviews.filter((r) => r.rating === star).length / reviews.length) * 100 : 0,
    }));

    return (
        <section className="mt-12">
            <h2 className="section-title mb-6">⭐ Đánh giá ({reviews.length})</h2>

            {/* Summary */}
            {reviews.length > 0 && (
                <div className="flex gap-8 p-5 bg-white dark:bg-card rounded-2xl border border-border mb-8">
                    <div className="text-center">
                        <p className="text-5xl font-black text-[var(--pet-coral)]">{averageRating.toFixed(1)}</p>
                        <div className="flex gap-0.5 justify-center mt-1">
                            {[1, 2, 3, 4, 5].map((s) => (
                                <svg key={s} className={`w-4 h-4 ${s <= Math.round(averageRating) ? "text-amber-400" : "text-gray-200"}`} fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{reviews.length} đánh giá</p>
                    </div>
                    <div className="flex-1 flex flex-col gap-1.5">
                        {breakdown.map(({ star, pct, count }) => (
                            <div key={star} className="flex items-center gap-2 text-xs">
                                <span className="text-muted-foreground w-6 text-right">{star}★</span>
                                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-muted-foreground w-5">{count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Reviews list */}
            <div className="flex flex-col gap-4 mb-8">
                {reviews.map((r) => (
                    <div key={r._id} className="p-4 bg-white dark:bg-card rounded-2xl border border-border">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--pet-coral)] to-[var(--pet-mint)] flex items-center justify-center text-white text-sm font-bold">
                                {r.userId.displayName?.[0]}
                            </div>
                            <div>
                                <p className="text-sm font-bold text-foreground">{r.userId.displayName}</p>
                                <div className="flex">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                        <span key={s} className="text-xs">{s <= r.rating ? "⭐" : ""}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <p className="text-sm text-foreground leading-relaxed">{r.comment}</p>
                    </div>
                ))}
            </div>

            {/* Write review */}
            {user ? (
                <div className="bg-white dark:bg-card rounded-2xl border border-border p-5">
                    <h3 className="font-bold mb-4" style={{ fontFamily: "'Nunito', sans-serif" }}>Viết đánh giá của bạn</h3>
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">Số sao</p>
                            <StarPicker rating={rating} onChange={setRating} />
                        </div>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm..."
                            rows={3}
                            className="w-full px-4 py-3 rounded-2xl border border-border bg-muted/30 text-sm
                         focus:outline-none focus:ring-2 focus:ring-[var(--pet-coral)]/40 focus:border-[var(--pet-coral)]
                         transition-all resize-none placeholder:text-muted-foreground"
                        />
                        <div className="flex justify-end">
                            <button type="submit" disabled={submitting || !comment.trim()} className="btn-pet-primary disabled:opacity-50">
                                {submitting ? "Đang gửi..." : "Gửi đánh giá"}
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="text-center p-6 bg-muted/30 rounded-2xl border border-dashed border-border">
                    <p className="text-sm text-muted-foreground">
                        <Link to="/signin" className="text-[var(--pet-coral)] font-semibold hover:underline">Đăng nhập</Link> để gửi đánh giá.
                    </p>
                </div>
            )}
        </section>
    );
};

export default ProductReviews;