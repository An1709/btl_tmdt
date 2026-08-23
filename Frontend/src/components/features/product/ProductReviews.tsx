import { type FormEvent, useState } from "react";
import { Link } from "react-router";
import { Star } from "lucide-react";
import type { ProductReview } from "@/types/product";
import { productService } from "@/services/productService";
import { useAuthStore } from "@/stores/useAuthStore";
import { toast } from "sonner";
import UserAvatar from "@/components/common/UserAvatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback-state";
import { FormField } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/utils/format";

interface ProductReviewsProps {
    productId: string;
    reviews?: ProductReview[];
    averageRating?: number;
    reviewCount?: number;
    onReviewAdded?: () => void;
}

const RatingStars = ({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) => (
    <span aria-hidden="true" className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
            <Star
                key={star}
                className={`${size === "md" ? "size-5" : "size-4"} ${star <= Math.round(rating) ? "text-warning" : "text-border-strong"}`}
                fill="currentColor"
            />
        ))}
    </span>
);

const StarPicker = ({ rating, onChange, disabled = false }: { rating: number; onChange: (rating: number) => void; disabled?: boolean }) => {
    const [previewRating, setPreviewRating] = useState(0);
    const visibleRating = previewRating || rating;

    return (
        <div role="radiogroup" aria-label="Số sao đánh giá" className="flex w-fit items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    role="radio"
                    aria-checked={rating === star}
                    aria-label={`${star} sao`}
                    disabled={disabled}
                    onMouseEnter={() => setPreviewRating(star)}
                    onMouseLeave={() => setPreviewRating(0)}
                    onFocus={() => setPreviewRating(star)}
                    onBlur={() => setPreviewRating(0)}
                    onClick={() => onChange(star)}
                    className="flex size-11 items-center justify-center rounded-md text-border-strong transition-colors hover:bg-warning-subtle hover:text-warning focus-visible:text-warning disabled:pointer-events-none disabled:opacity-50"
                >
                    <Star aria-hidden="true" className="size-6" fill={star <= visibleRating ? "currentColor" : "none"} />
                </button>
            ))}
        </div>
    );
};

const getErrorMessage = (error: unknown, fallback: string) => {
    if (error && typeof error === "object" && "response" in error) {
        const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
        if (!message) return fallback;

        const normalized = message.toLowerCase();
        if (normalized.includes("already reviewed")) return "Bạn đã đánh giá sản phẩm này rồi.";
        if (normalized.includes("chi co the danh gia") || normalized.includes("only review")) {
            return "Bạn chỉ có thể đánh giá sản phẩm đã mua và được giao thành công.";
        }
        if (normalized.includes("comment is required")) return "Vui lòng nhập nội dung đánh giá.";
        if (normalized.includes("rating")) return "Vui lòng chọn số sao từ 1 đến 5.";
        return message;
    }

    return fallback;
};

const ProductReviews = ({
    productId,
    reviews = [],
    averageRating = 0,
    reviewCount,
    onReviewAdded,
}: ProductReviewsProps) => {
    const { user } = useAuthStore();
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState("");
    const [commentError, setCommentError] = useState("");
    const [formError, setFormError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const totalReviewCount = reviewCount ?? reviews.length;
    const hasReviewed = Boolean(user && reviews.some((review) => review.user?._id === user._id));

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        if (submitting) return;

        setFormError("");
        if (rating < 1 || rating > 5) {
            setFormError("Vui lòng chọn số sao từ 1 đến 5.");
            return;
        }

        if (!comment.trim()) {
            setCommentError("Vui lòng nhập nội dung đánh giá.");
            return;
        }

        setCommentError("");
        setSubmitting(true);
        try {
            await productService.submitReview(productId, { rating, comment: comment.trim() });
            toast.success("Cảm ơn đánh giá của bạn!");
            setComment("");
            setRating(5);
            onReviewAdded?.();
        } catch (error: unknown) {
            const message = getErrorMessage(error, "Không thể gửi đánh giá. Vui lòng thử lại.");
            setFormError(message);
            toast.error(message);
        } finally {
            setSubmitting(false);
        }
    };

    const breakdown = [5, 4, 3, 2, 1].map((star) => {
        const count = reviews.filter((review) => review.rating === star).length;
        return { star, count, percentage: reviews.length ? (count / reviews.length) * 100 : 0 };
    });

    return (
        <section className="mt-14 border-t border-divider pt-10" aria-labelledby="reviews-heading">
            <div className="mb-6">
                <h2 id="reviews-heading" className="section-title">Đánh giá sản phẩm</h2>
                <p className="mt-2 text-sm text-muted-foreground">Ý kiến từ khách hàng đã mua và nhận sản phẩm.</p>
            </div>

            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
                <div className="min-w-0">
                    {reviews.length > 0 ? (
                        <>
                            <div className="mb-8 grid gap-6 rounded-lg bg-surface-subtle p-5 sm:grid-cols-[10rem_1fr] sm:items-center sm:p-6">
                                <div>
                                    <p className="text-3xl font-bold text-text-strong">{averageRating.toFixed(1)}<span className="text-base font-medium text-muted-foreground">/5</span></p>
                                    <div className="mt-2" aria-label={`${averageRating.toFixed(1)} trên 5 sao`}>
                                        <RatingStars rating={averageRating} size="md" />
                                    </div>
                                    <p className="mt-2 text-sm text-muted-foreground">{totalReviewCount} đánh giá</p>
                                </div>

                                <div className="flex flex-col gap-2.5" aria-label="Phân bố đánh giá theo số sao">
                                    {breakdown.map(({ star, count, percentage }) => (
                                        <div key={star} className="grid grid-cols-[2.25rem_1fr_2rem] items-center gap-2 text-sm">
                                            <span className="text-right text-muted-foreground">{star}★</span>
                                            <div
                                                role="progressbar"
                                                aria-label={`${star} sao: ${count} đánh giá`}
                                                aria-valuemin={0}
                                                aria-valuemax={reviews.length}
                                                aria-valuenow={count}
                                                className="h-2 overflow-hidden rounded-full bg-muted"
                                            >
                                                <div className="h-full rounded-full bg-warning" style={{ width: `${percentage}%` }} />
                                            </div>
                                            <span className="text-muted-foreground">{count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="divide-y divide-divider">
                                {reviews.map((review) => {
                                    const reviewerName = review.user?.displayName || review.user?.username || "Người dùng";
                                    return (
                                        <article key={review._id} className="py-5 first:pt-0">
                                            <div className="flex items-start gap-3">
                                                <UserAvatar user={review.user} className="size-10" />
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                                                        <div>
                                                            <h3 className="text-sm font-semibold text-text-strong">{reviewerName}</h3>
                                                            <div className="mt-1" aria-label={`${review.rating} trên 5 sao`}>
                                                                <RatingStars rating={review.rating} />
                                                            </div>
                                                        </div>
                                                        {review.createdAt && (
                                                            <time dateTime={review.createdAt} className="shrink-0 text-xs text-muted-foreground">
                                                                {formatDate(review.createdAt)}
                                                            </time>
                                                        )}
                                                    </div>
                                                    <p className="mt-3 max-w-prose whitespace-pre-line break-words text-sm leading-6 text-foreground">{review.comment}</p>
                                                </div>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        <EmptyState
                            title="Chưa có đánh giá"
                            description="Hãy là người đầu tiên chia sẻ trải nghiệm sau khi đơn hàng được giao thành công."
                            className="rounded-lg bg-surface-subtle"
                        />
                    )}
                </div>

                <aside className="rounded-lg border border-border bg-surface-elevated p-5 lg:sticky lg:top-24" aria-label="Gửi đánh giá">
                    <h3 className="text-lg font-semibold text-text-strong">Đánh giá của bạn</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">Chỉ khách hàng đã nhận sản phẩm mới có thể gửi một đánh giá.</p>

                    {user && !hasReviewed ? (
                        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-5" noValidate>
                            <fieldset disabled={submitting}>
                                <legend className="mb-2 text-sm font-medium text-text-strong">Mức độ hài lòng</legend>
                                <StarPicker rating={rating} onChange={setRating} disabled={submitting} />
                            </fieldset>

                            <FormField label="Nội dung đánh giá" required error={commentError}>
                                {(controlProps) => (
                                    <Textarea
                                        {...controlProps}
                                        value={comment}
                                        onChange={(event) => {
                                            setComment(event.target.value);
                                            if (commentError && event.target.value.trim()) setCommentError("");
                                        }}
                                        placeholder="Chia sẻ trải nghiệm thực tế của bạn về sản phẩm..."
                                        rows={5}
                                        disabled={submitting}
                                        className="resize-y"
                                    />
                                )}
                            </FormField>

                            {formError && <p role="alert" className="rounded-md bg-destructive-subtle px-3 py-2 text-sm text-destructive-subtle-foreground">{formError}</p>}

                            <Button type="submit" loading={submitting} disabled={!comment.trim()} className="w-full">
                                Gửi đánh giá
                            </Button>
                        </form>
                    ) : hasReviewed ? (
                        <p className="mt-5 rounded-md bg-success-subtle px-3 py-3 text-sm text-success-subtle-foreground">Bạn đã đánh giá sản phẩm này.</p>
                    ) : (
                        <Button asChild variant="outline" className="mt-5 w-full">
                            <Link to="/signin">Đăng nhập để đánh giá</Link>
                        </Button>
                    )}
                </aside>
            </div>
        </section>
    );
};

export default ProductReviews;
