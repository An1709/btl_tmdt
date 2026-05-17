import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import UserAvatar from "@/components/common/UserAvatar";
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
        <div className="flex gap-1" aria-label="Đánh giá bài viết">
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHover(star)}
                    onMouseLeave={() => setHover(0)}
                    onClick={() => onChange(star)}
                    className="text-2xl transition-transform hover:scale-110"
                    aria-label={`${star} sao`}
                >
                    {star <= (hover || rating) ? "⭐" : "☆"}
                </button>
            ))}
        </div>
    );
};

const RatingStars = ({ rating }: { rating: number }) => (
    <div className="flex gap-0.5" aria-label={`${rating} sao`}>
        {[1, 2, 3, 4, 5].map((star) => (
            <span key={star} className={`text-xs ${star <= rating ? "text-amber-400" : "text-muted-foreground/40"}`}>
                ★
            </span>
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
    const [rating, setRating] = useState(0);
    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();

        if (!user) {
            toast.error("Vui lòng đăng nhập để bình luận.");
            return;
        }

        if (rating < 1 || rating > 5) {
            toast.error("Vui lòng chọn số sao.");
            return;
        }

        if (!content.trim()) {
            toast.error("Vui lòng nhập nội dung bình luận.");
            return;
        }

        setLoading(true);
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
            toast.error(getErrorMessage(error, "Không thể gửi bình luận. Vui lòng thử lại sau."));
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="mt-10">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
                <div>
                    <h3 className="section-title text-xl">Bình luận và đánh giá</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        {commentCount} bình luận · {averageRating > 0 ? averageRating.toFixed(1) : "0.0"}/5 sao
                    </p>
                </div>
                <div className="flex items-center gap-2 text-amber-400">
                    <RatingStars rating={Math.round(averageRating)} />
                    <span className="text-sm font-semibold text-foreground">{averageRating > 0 ? averageRating.toFixed(1) : "0.0"}</span>
                </div>
            </div>

            <div className="flex flex-col gap-4 mb-8">
                {comments.length === 0 && (
                    <p className="text-center text-muted-foreground py-8 text-sm bg-muted/20 rounded-2xl border border-dashed border-border">
                        Chưa có bình luận nào.
                    </p>
                )}

                {comments.map((comment) => {
                    const commentUser = comment.user || {
                        displayName: comment.username,
                        username: comment.username,
                        avatarUrl: comment.avatarUrl,
                    };

                    return (
                        <div key={comment._id} className="flex gap-3 p-4 bg-white dark:bg-card rounded-2xl border border-border">
                            <UserAvatar user={commentUser} className="w-9 h-9" fallbackClassName="text-sm" />
                            <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1">
                                    <span className="text-sm font-bold text-foreground">{comment.username}</span>
                                    <RatingStars rating={comment.rating} />
                                    <span className="text-xs text-muted-foreground">{formatRelativeTime(comment.createdAt)}</span>
                                </div>
                                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {user ? (
                <div className="bg-white dark:bg-card rounded-2xl border border-border p-5">
                    <h4 className="font-bold mb-4" style={{ fontFamily: "'Nunito', sans-serif" }}>Đánh giá bài viết</h4>
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">Chọn số sao</p>
                            <StarPicker rating={rating} onChange={setRating} />
                        </div>
                        <textarea
                            value={content}
                            onChange={(event) => setContent(event.target.value)}
                            placeholder="Viết bình luận của bạn"
                            rows={3}
                            className="w-full px-4 py-3 rounded-2xl border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pet-coral)]/40 focus:border-[var(--pet-coral)] transition-all resize-none placeholder:text-muted-foreground"
                        />
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-pet-primary disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? "Đang gửi..." : "Gửi bình luận"}
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="text-center p-6 bg-muted/30 rounded-2xl border border-dashed border-border">
                    <p className="text-sm text-muted-foreground">
                        Vui lòng{" "}
                        <Link to="/signin" className="text-[var(--pet-coral)] font-semibold hover:underline">
                            đăng nhập
                        </Link>{" "}
                        để bình luận.
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Vui lòng đăng nhập để bình luận.</p>
                </div>
            )}
        </section>
    );
};

export default CommentSection;
