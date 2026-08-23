import { useState, type FormEvent } from "react";
import { Link, useLocation } from "react-router";
import { Star } from "lucide-react";
import { toast } from "sonner";
import UserAvatar from "@/components/common/UserAvatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback-state";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/field";
import type { Comment } from "@/types/post";
import { useAuthStore } from "@/stores/useAuthStore";
import { postService, type BlogCommentResponse } from "@/services/postService";
import { formatRelativeTime } from "@/utils/format";

interface CommentSectionProps {
    postId: string;
    comments: Comment[];
    averageRating: number;
    commentCount: number;
    onCommentAdded: (response: BlogCommentResponse) => void;
}

const getErrorMessage = (error: unknown, fallback: string) =>
    (error as { response?: { data?: { message?: string } } }).response?.data?.message || fallback;

const StarPicker = ({ rating, onChange }: { rating: number; onChange: (rating: number) => void }) => {
    const [hover, setHover] = useState(0);

    return (
        <div className="flex gap-1" role="group" aria-label="Đánh giá bài viết">
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHover(star)}
                    onMouseLeave={() => setHover(0)}
                    onClick={() => onChange(star)}
                    className="rounded-md p-1 text-amber-500 outline-none transition-colors hover:bg-primary-subtle focus-visible:ring-2 focus-visible:ring-focus/45"
                    aria-label={`${star} sao`}
                    aria-pressed={star === rating}
                >
                    <Star aria-hidden="true" className={`size-6 ${star <= (hover || rating) ? "fill-current" : ""}`} />
                </button>
            ))}
        </div>
    );
};

const RatingStars = ({ rating }: { rating: number }) => (
    <div className="flex gap-0.5" aria-label={`${rating} trên 5 sao`}>
        {[1, 2, 3, 4, 5].map((star) => (
            <Star key={star} aria-hidden="true" className={`size-3.5 ${star <= rating ? "fill-current text-amber-500" : "text-muted-foreground/40"}`} />
        ))}
    </div>
);

const CommentSection = ({
    postId,
    comments,
    averageRating,
    commentCount,
    onCommentAdded,
}: CommentSectionProps) => {
    const { user } = useAuthStore();
    const location = useLocation();
    const [rating, setRating] = useState(0);
    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(false);
    const [formError, setFormError] = useState("");
    const [submitError, setSubmitError] = useState("");

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();

        if (!user) {
            toast.error("Vui lòng đăng nhập để bình luận.");
            return;
        }

        if (rating < 1 || rating > 5) {
            setFormError("Vui lòng chọn số sao.");
            toast.error("Vui lòng chọn số sao.");
            return;
        }

        if (!content.trim()) {
            setFormError("Vui lòng nhập nội dung bình luận.");
            toast.error("Vui lòng nhập nội dung bình luận.");
            return;
        }

        setLoading(true);
        setFormError("");
        setSubmitError("");
        try {
            const response = await postService.addComment(postId, {
                rating,
                content: content.trim(),
            });
            onCommentAdded(response);
            setContent("");
            setRating(0);
            toast.success("Cảm ơn bạn đã gửi đánh giá.");
        } catch (error) {
            const message = getErrorMessage(error, "Không thể gửi bình luận. Vui lòng thử lại sau.");
            setSubmitError(message);
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="mt-12 border-t border-border pt-10" aria-labelledby="comments-heading">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h2 id="comments-heading" className="text-xl font-semibold text-text-strong">Bình luận và đánh giá</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {commentCount} bình luận · {averageRating > 0 ? averageRating.toFixed(1) : "0.0"}/5 sao
                    </p>
                </div>
                <div className="flex items-center gap-2" aria-label={`Điểm trung bình ${averageRating > 0 ? averageRating.toFixed(1) : "0.0"} trên 5`}>
                    <RatingStars rating={Math.round(averageRating)} />
                    <span className="text-sm font-semibold text-foreground">{averageRating > 0 ? averageRating.toFixed(1) : "0.0"}</span>
                </div>
            </div>

            <div className="mb-8 flex flex-col gap-3">
                {comments.length === 0 && (
                    <EmptyState title="Chưa có bình luận nào" description="Hãy là người đầu tiên chia sẻ trải nghiệm về bài viết này." />
                )}

                {comments.map((comment) => {
                    const commentUser = comment.user || {
                        displayName: comment.username,
                        username: comment.username,
                        avatarUrl: comment.avatarUrl,
                    };

                    return (
                        <article key={comment._id} className="flex gap-3 rounded-xl border border-border bg-surface p-4">
                            <UserAvatar user={commentUser} className="w-9 h-9" fallbackClassName="text-sm" />
                            <div className="flex-1 min-w-0">
                                <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                                    <span className="text-sm font-semibold text-text-strong">{comment.username}</span>
                                    <RatingStars rating={comment.rating} />
                                    <span className="text-xs text-muted-foreground">{formatRelativeTime(comment.createdAt)}</span>
                                </div>
                                <p className="whitespace-pre-wrap break-words text-sm leading-6 text-foreground">{comment.content}</p>
                            </div>
                        </article>
                    );
                })}
            </div>

            {user ? (
                <div className="rounded-xl border border-border bg-surface p-5">
                    <h3 className="mb-1 text-base font-semibold text-text-strong">Chia sẻ đánh giá của bạn</h3>
                    <p className="mb-5 text-sm text-muted-foreground">Đánh giá và bình luận giúp PetMart cải thiện nội dung.</p>
                    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                        <fieldset className="flex flex-col gap-2">
                            <legend className="text-sm font-medium text-text-strong">Mức đánh giá <span aria-hidden="true" className="text-destructive">*</span></legend>
                            <StarPicker rating={rating} onChange={(value) => { setRating(value); setFormError(""); }} />
                        </fieldset>
                        <FormField label="Nội dung bình luận" required error={formError} id="blog-comment">
                            {(controlProps) => <Textarea {...controlProps} value={content} onChange={(event) => { setContent(event.target.value); setFormError(""); }} placeholder="Viết bình luận của bạn" rows={4} />}
                        </FormField>
                        {submitError && <p role="alert" className="text-sm text-destructive">{submitError}</p>}
                        <div className="flex justify-end"><Button type="submit" loading={loading}>Gửi bình luận</Button></div>
                    </form>
                </div>
            ) : (
                <div className="rounded-xl border border-dashed border-border bg-surface-subtle p-6 text-center">
                    <p className="text-sm text-muted-foreground">Đăng nhập để đánh giá và tham gia thảo luận.</p>
                    <Button asChild variant="outline" className="mt-4"><Link to="/signin" state={{ from: `${location.pathname}${location.search}`, routeState: location.state }}>Đăng nhập để bình luận</Link></Button>
                </div>
            )}
        </section>
    );
};

export default CommentSection;
