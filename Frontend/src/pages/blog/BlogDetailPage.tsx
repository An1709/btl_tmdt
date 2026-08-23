import { useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import DOMPurify from "dompurify";
import { ArrowLeft, CalendarDays, Eye, ImageOff, MessageCircle, RefreshCw, Star } from "lucide-react";
import { useParams, Link } from "react-router";
import { postService, type BlogCommentResponse } from "@/services/postService";
import type { Post } from "@/types/post";
import CommentSection from "@/components/features/blog/CommentSection";
import { SkeletonBlock } from "@/components/common/Loading";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState, ErrorState } from "@/components/ui/feedback-state";
import { formatDate } from "@/utils/format";

const BlogDetailPage = () => {
    const { slug } = useParams<{ slug: string }>();
    const [post, setPost] = useState<Post | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [notFound, setNotFound] = useState(false);
    const [retryNonce, setRetryNonce] = useState(0);
    const [imageFailed, setImageFailed] = useState(false);

    const sanitizedContent = useMemo(
        () => DOMPurify.sanitize(post?.content ?? ""),
        [post?.content],
    );

    useEffect(() => {
        let isMounted = true;

        const loadPost = async () => {
            if (!slug) {
                setNotFound(true);
                setLoading(false);
                return;
            }

            setLoading(true);
            setError("");
            setNotFound(false);

            try {
                const postDetail = await postService.getPostBySlug(slug);
                if (isMounted) {
                    setPost(postDetail);
                    setImageFailed(false);
                }
            } catch (requestError) {
                if (isMounted) {
                    setPost(null);
                    if (isAxiosError(requestError) && requestError.response?.status === 404) {
                        setNotFound(true);
                    } else {
                        setError("Không thể tải bài viết. Vui lòng thử lại sau.");
                    }
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        void loadPost();

        return () => {
            isMounted = false;
        };
    }, [slug, retryNonce]);

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

    if (loading) return (
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6" aria-busy="true" aria-label="Đang tải bài viết">
            <SkeletonBlock className="mb-5 h-4 w-40" />
            <SkeletonBlock className="mb-4 h-12 w-full max-w-3xl" />
            <SkeletonBlock className="mb-8 h-4 w-64" />
            <SkeletonBlock className="mb-8 aspect-video w-full" />
            <div className="mx-auto max-w-[70ch] space-y-4"><SkeletonBlock className="h-4 w-full" /><SkeletonBlock className="h-4 w-11/12" /><SkeletonBlock className="h-4 w-4/5" /></div>
        </div>
    );

    if (notFound) return (
        <div className="mx-auto max-w-3xl px-4 py-16"><EmptyState title="Bài viết không tồn tại" description="Bài viết có thể đã được di chuyển hoặc không còn công khai." action={<Button asChild><Link to="/blog"><ArrowLeft aria-hidden="true" />Quay lại Blog</Link></Button>} /></div>
    );

    if (error) return (
        <div className="mx-auto max-w-3xl px-4 py-16"><ErrorState title="Không tải được bài viết" description={error} action={<div className="flex flex-wrap justify-center gap-3"><Button onClick={() => setRetryNonce((value) => value + 1)}><RefreshCw aria-hidden="true" />Thử lại</Button><Button asChild variant="outline"><Link to="/blog"><ArrowLeft aria-hidden="true" />Quay lại Blog</Link></Button></div>} /></div>
    );

    if (!post) return null;

    const tags = Array.isArray(post.tags) ? post.tags : [];
    const comments = Array.isArray(post.comments) ? post.comments : [];
    const commentCount = post.commentCount ?? comments.length;
    const averageRating = Number(post.averageRating ?? 0);
    const authorName = post.author?.displayName || post.author?.username || "PetMart";

    return (
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
            <nav aria-label="Breadcrumb" className="mb-8 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Link to="/" className="hover:text-primary">Trang chủ</Link><span aria-hidden="true">/</span><Link to="/blog" className="hover:text-primary">Blog</Link><span aria-hidden="true">/</span><span className="line-clamp-1 text-foreground">{post.title}</span>
            </nav>

            {tags.length > 0 && <div className="mb-4 flex flex-wrap gap-2">{tags.map((tag) => <Badge key={tag} tone="info">{tag}</Badge>)}</div>}

            <h1 className="max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-text-strong sm:text-4xl">{post.title}</h1>

            <div className="mb-8 mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border pb-6 text-sm text-muted-foreground">
                <span className="font-medium text-text-strong">{authorName}</span><span className="inline-flex items-center gap-1"><CalendarDays aria-hidden="true" className="size-4" />{formatDate(post.createdAt)}</span>
                <span className="inline-flex items-center gap-1"><Eye aria-hidden="true" className="size-4" />{post.viewCount} lượt xem</span><span className="inline-flex items-center gap-1"><MessageCircle aria-hidden="true" className="size-4" />{commentCount} bình luận</span><span className="inline-flex items-center gap-1"><Star aria-hidden="true" className="size-4 fill-current text-amber-500" />{averageRating > 0 ? averageRating.toFixed(1) : "0.0"}/5</span>
                </div>

            <div className="mb-9 aspect-video overflow-hidden rounded-xl bg-muted">
                {post.coverImage && !imageFailed ? (
                    <img src={post.coverImage} alt="" className="h-full w-full object-cover" onError={() => setImageFailed(true)} />
                ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground"><ImageOff aria-hidden="true" className="size-9" /><span className="text-sm">Không có ảnh bìa</span></div>
                )}
            </div>

            <article className="mx-auto max-w-[70ch]">
                {post.excerpt && <p className="mb-7 rounded-lg bg-primary-subtle px-4 py-3 text-base italic leading-7 text-primary-subtle-foreground">{post.excerpt}</p>}
                <div className="article-content" dangerouslySetInnerHTML={{ __html: sanitizedContent }} />
            </article>

            <div className="mx-auto max-w-[70ch]">
                <CommentSection
                    postId={post._id}
                    comments={comments}
                    averageRating={averageRating}
                    commentCount={commentCount}
                    onCommentAdded={handleCommentAdded}
                />
            </div>
        </div>
    );
};

export default BlogDetailPage;
