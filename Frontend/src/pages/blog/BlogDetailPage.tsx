import { useEffect, useState } from "react";
import { useParams, Link } from "react-router";
import { postService } from "@/services/postService";
import type { Post, Comment } from "@/types/post";
import CommentSection from "@/components/features/blog/CommentSection";
import Loading from "@/components/common/Loading";
import { formatDate } from "@/utils/format";

const BlogDetailPage = () => {
    const { slug } = useParams<{ slug: string }>();
    const [post, setPost] = useState<Post | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (slug) postService.getPostBySlug(slug).then(setPost).catch(console.error).finally(() => setLoading(false));
    }, [slug]);

    const handleCommentAdded = (comment: Comment) => {
        setPost((p) => p ? { ...p, comments: [...p.comments, comment] } : p);
    };

    if (loading) return <Loading fullPage />;
    if (!post) return (
        <div className="max-w-3xl mx-auto px-4 py-24 text-center">
            <div className="text-6xl mb-4">😿</div>
            <h1 className="section-title mb-4">Bài viết không tồn tại</h1>
            <Link to="/blog" className="btn-pet-primary inline-flex">← Quay lại Blog</Link>
        </div>
    );

    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
                <Link to="/" className="hover:text-[var(--pet-coral)] transition-colors">Trang chủ</Link>
                <span>/</span>
                <Link to="/blog" className="hover:text-[var(--pet-coral)] transition-colors">Blog</Link>
                <span>/</span>
                <span className="text-foreground line-clamp-1">{post.title}</span>
            </nav>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-4">
                {post.tags.map((tag) => <span key={tag} className="badge-new">{tag}</span>)}
            </div>

            {/* Title */}
            <h1 className="text-3xl font-black text-foreground mb-4 leading-tight" style={{ fontFamily: "'Nunito', sans-serif" }}>
                {post.title}
            </h1>

            {/* Author/meta */}
            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-border">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--pet-coral)] to-[var(--pet-mint)] flex items-center justify-center text-white font-bold">
                    {post.author.displayName?.[0] ?? "P"}
                </div>
                <div>
                    <p className="font-bold text-sm text-foreground">{post.author.displayName}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{formatDate(post.createdAt)}</span>
                        <span>👁 {post.viewCount} lượt xem</span>
                        <span>💬 {post.comments.length} bình luận</span>
                    </div>
                </div>
            </div>

            {/* Cover image */}
            <div className="rounded-3xl overflow-hidden mb-8 aspect-video">
                <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover" />
            </div>

            {/* Excerpt */}
            <p className="text-muted-foreground text-base leading-relaxed mb-4 italic border-l-4 border-[var(--pet-coral)] pl-4">
                {post.excerpt}
            </p>

            {/* Content */}
            <div
                className="prose prose-sm max-w-none text-foreground leading-relaxed"
                dangerouslySetInnerHTML={{ __html: post.content }}
            />

            {/* Comments */}
            <CommentSection postId={post._id} comments={post.comments} onCommentAdded={handleCommentAdded} />
        </div>
    );
};

export default BlogDetailPage;