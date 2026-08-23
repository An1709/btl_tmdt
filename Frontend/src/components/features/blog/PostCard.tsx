import { useState } from "react";
import { CalendarDays, Eye, ImageOff, MessageCircle, Star } from "lucide-react";
import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import type { Post } from "@/types/post";
import { formatRelativeTime } from "@/utils/format";

interface PostCardProps {
    post: Post;
}

const PostCard = ({ post }: PostCardProps) => {
    const [imageFailed, setImageFailed] = useState(false);
    const tags = Array.isArray(post.tags) ? post.tags : [];
    const authorName = post.author?.displayName || post.author?.username || "PetMart";
    const averageRating = Number(post.averageRating ?? 0);
    const commentCount = Number(post.commentCount ?? post.reviewCount ?? post.comments?.length ?? 0);
    const viewCount = Number(post.viewCount ?? 0);

    return (
        <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-surface transition-colors duration-base hover:border-primary/45">
            <Link to={`/blog/${post.slug}`} aria-label={`Đọc bài viết: ${post.title}`} className="relative block aspect-video overflow-hidden bg-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-focus/45 focus-visible:ring-inset">
                {post.coverImage && !imageFailed ? (
                    <img src={post.coverImage} alt="" className="h-full w-full object-cover transition-[filter] duration-base group-hover:brightness-95" loading="lazy" onError={() => setImageFailed(true)} />
                ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground"><ImageOff aria-hidden="true" className="size-8" /><span className="text-xs">Không có ảnh bìa</span></div>
                )}
                {tags.length > 0 && <Badge tone="neutral" className="absolute left-3 top-3 bg-surface/95">{tags[0]}</Badge>}
            </Link>

            <div className="flex flex-1 flex-col gap-4 p-5">
                <div className="flex flex-wrap gap-2">{tags.slice(1, 3).map((tag) => <Badge key={tag} tone="info">{tag}</Badge>)}</div>
                <div className="flex flex-1 flex-col gap-2">
                    <h2 className="line-clamp-2 text-lg font-semibold leading-snug text-text-strong group-hover:text-primary"><Link to={`/blog/${post.slug}`} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/45">{post.title}</Link></h2>
                    {post.excerpt && <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">{post.excerpt}</p>}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
                    <div className="flex min-w-0 items-center gap-2"><span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-xs font-semibold text-primary-subtle-foreground">{authorName[0]?.toUpperCase() ?? "P"}</span><span className="truncate font-medium text-text-strong">{authorName}</span></div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1" aria-label="Thông tin bài viết">
                        <span className="inline-flex items-center gap-1"><CalendarDays aria-hidden="true" className="size-3.5" />{formatRelativeTime(post.createdAt)}</span>
                        {viewCount > 0 && <span className="inline-flex items-center gap-1"><Eye aria-hidden="true" className="size-3.5" />{viewCount}</span>}
                        {(averageRating > 0 || commentCount > 0) && <span className="inline-flex items-center gap-1"><Star aria-hidden="true" className="size-3.5 fill-current text-amber-500" />{averageRating > 0 ? averageRating.toFixed(1) : "—"}</span>}
                        {commentCount > 0 && <span className="inline-flex items-center gap-1"><MessageCircle aria-hidden="true" className="size-3.5" />{commentCount}</span>}
                    </div>
                </div>
            </div>
        </article>
    );
};

export default PostCard;
