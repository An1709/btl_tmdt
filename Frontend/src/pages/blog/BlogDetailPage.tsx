import { useEffect, useState } from "react";
import { useParams, Link } from "react-router";
import { postService, type BlogCommentResponse } from "@/services/postService";
import type { Post } from "@/types/post";
import CommentSection from "@/components/features/blog/CommentSection";
import Loading from "@/components/common/Loading";
import { formatDate } from "@/utils/format";

const BlogDetailPage = () => {
    const { slug } = useParams<{ slug: string }>();
    const [post, setPost] = useState<Post | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let isMounted = true;

        const loadPost = async () => {
            if (!slug) {
                setLoading(false);
                return;
            }

            setLoading(true);
            setError("");

            try {
                const postDetail = await postService.getPostBySlug(slug);
                if (isMounted) {
                    setPost(postDetail);
                }
            } catch {
                if (isMounted) {
                    setPost(null);
                    setError("Không thể tải bài viết. Vui lòng thử lại sau.");
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        void loadPost();

        return () => {
            isMounted = false;
        };
    }, [slug]);

    const handleCommentAdded = (response: BlogCommentResponse) => {
        setPost((p) => {
            if (!p) return p;

            const nextComments = p.comments.some((comment) => comment._id === response.comment._id)
                ? p.comments.map((comment) => comment._id === response.comment._id ? response.comment : comment)
                : [response.comment, ...p.comments];

            return {
                ...p,
                comments: nextComments,
                averageRating: response.averageRating,
                commentCount: response.commentCount,
                reviewCount: response.reviewCount,
            };
        });
    };

    if (loading) return <Loading fullPage />;

    if (error) return (
        <div className="max-w-3xl mx-auto px-4 py-24 text-center">
            <div className="text-6xl mb-4">📝</div>
            <h1 className="section-title mb-4">{error}</h1>
            <Link to="/blog" className="btn-pet-primary inline-flex">← Quay lại Blog</Link>
        </div>
    );

    if (!post) return (
        <div className="max-w-3xl mx-auto px-4 py-24 text-center">
            <div className="text-6xl mb-4">😿</div>
            <h1 className="section-title mb-4">Bài viết không tồn tại</h1>
            <Link to="/blog" className="btn-pet-primary inline-flex">← Quay lại Blog</Link>
        </div>
    );

    const tags = Array.isArray(post.tags) ? post.tags : [];
    const comments = Array.isArray(post.comments) ? post.comments : [];
    const commentCount = post.commentCount ?? comments.length;
    const averageRating = Number(post.averageRating ?? 0);
    const authorName = post.author?.displayName || post.author?.username || "PetMart";

    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
            <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
                <Link to="/" className="hover:text-[var(--pet-coral)] transition-colors">Trang chủ</Link>
                <span>/</span>
                <Link to="/blog" className="hover:text-[var(--pet-coral)] transition-colors">Blog</Link>
                <span>/</span>
                <span className="text-foreground line-clamp-1">{post.title}</span>
            </nav>

            <div className="flex flex-wrap gap-2 mb-4">
                {tags.map((tag) => <span key={tag} className="badge-new">{tag}</span>)}
            </div>

            <h1 className="text-3xl font-black text-foreground mb-4 leading-tight" style={{ fontFamily: "'Nunito', sans-serif" }}>
                {post.title}
            </h1>

            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-border">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--pet-coral)] to-[var(--pet-mint)] flex items-center justify-center text-white font-bold">
                    {authorName[0] ?? "P"}
                </div>
                <div>
                    <p className="font-bold text-sm text-foreground">{authorName}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{formatDate(post.createdAt)}</span>
                        <span>👁 {post.viewCount} lượt xem</span>
                        <span>💬 {commentCount} bình luận</span>
                        <span>⭐ {averageRating > 0 ? averageRating.toFixed(1) : "0.0"}/5</span>
                    </div>
                </div>
            </div>

            {post.coverImage && (
                <div className="rounded-3xl overflow-hidden mb-8 aspect-video">
                    <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover" />
                </div>
            )}

            {post.excerpt && (
                <p className="text-muted-foreground text-base leading-relaxed mb-4 italic border-l-4 border-[var(--pet-coral)] pl-4">
                    {post.excerpt}
                </p>
            )}

            <div
                className="prose prose-sm max-w-none text-foreground leading-relaxed"
                dangerouslySetInnerHTML={{ __html: post.content }}
            />

            <CommentSection
                postId={post._id}
                comments={comments}
                averageRating={averageRating}
                commentCount={commentCount}
                onCommentAdded={handleCommentAdded}
            />
        </div>
    );
};

export default BlogDetailPage;
