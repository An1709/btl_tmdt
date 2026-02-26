import { useState } from "react";
import type { Comment } from "@/types/post";
import { useAuthStore } from "@/stores/useAuthStore";
import { postService } from "@/services/postService";
import { formatRelativeTime } from "@/utils/format";
import { toast } from "sonner";
import { Link } from "react-router";

interface CommentSectionProps {
    postId: string;
    comments: Comment[];
    onCommentAdded: (comment: Comment) => void;
}

const CommentSection = ({ postId, comments, onCommentAdded }: CommentSectionProps) => {
    const { user } = useAuthStore();
    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;
        setLoading(true);
        try {
            const comment = await postService.addComment(postId, content.trim());
            onCommentAdded(comment);
            setContent("");
            toast.success("Đã thêm bình luận!");
        } catch {
            toast.error("Không thể gửi bình luận. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="mt-10">
            <h3 className="section-title text-xl mb-6">
                💬 Bình luận ({comments.length})
            </h3>

            {/* Comment list */}
            <div className="flex flex-col gap-4 mb-8">
                {comments.length === 0 && (
                    <p className="text-center text-muted-foreground py-8 text-sm">
                        Chưa có bình luận nào. Hãy là người đầu tiên! 🐾
                    </p>
                )}
                {comments.map((c) => (
                    <div key={c._id} className="flex gap-3 p-4 bg-white dark:bg-card rounded-2xl border border-border">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--pet-coral)] to-[var(--pet-mint)] flex items-center justify-center text-white text-sm font-bold shrink-0">
                            {c.username?.[0]?.toUpperCase() ?? "U"}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-bold text-foreground">{c.username}</span>
                                <span className="text-xs text-muted-foreground">{formatRelativeTime(c.createdAt)}</span>
                            </div>
                            <p className="text-sm text-foreground leading-relaxed">{c.content}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Add comment */}
            {user ? (
                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Viết bình luận của bạn..."
                        rows={3}
                        className="w-full px-4 py-3 rounded-2xl border border-border bg-muted/30 text-sm
                       focus:outline-none focus:ring-2 focus:ring-[var(--pet-coral)]/40 focus:border-[var(--pet-coral)]
                       transition-all resize-none placeholder:text-muted-foreground"
                    />
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={loading || !content.trim()}
                            className="btn-pet-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? "Đang gửi..." : "Gửi bình luận"}
                        </button>
                    </div>
                </form>
            ) : (
                <div className="text-center p-6 bg-muted/30 rounded-2xl border border-dashed border-border">
                    <p className="text-sm text-muted-foreground">
                        <Link to="/signin" className="text-[var(--pet-coral)] font-semibold hover:underline">
                            Đăng nhập
                        </Link>{" "}
                        để có thể bình luận.
                    </p>
                </div>
            )}
        </section>
    );
};

export default CommentSection;