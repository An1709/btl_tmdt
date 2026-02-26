import { Link } from "react-router";
import type { Post } from "@/types/post";
import { formatRelativeTime } from "@/utils/format";

interface PostCardProps {
    post: Post;
}

const PostCard = ({ post }: PostCardProps) => {
    return (
        <article className="pet-card flex flex-col group overflow-hidden">
            {/* Image */}
            <div className="relative overflow-hidden aspect-video bg-muted/30">
                <img
                    src={post.coverImage}
                    alt={post.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                />
                {post.tags.length > 0 && (
                    <div className="absolute top-3 left-3">
                        <span className="badge-new">{post.tags[0]}</span>
                    </div>
                )}
            </div>

            {/* Body */}
            <div className="flex flex-col gap-3 p-5 flex-1">
                <h3
                    className="font-bold text-foreground text-base leading-snug line-clamp-2 group-hover:text-[var(--pet-coral)] transition-colors"
                    style={{ fontFamily: "'Nunito', sans-serif" }}
                >
                    <Link to={`/blog/${post.slug}`}>{post.title}</Link>
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {post.excerpt}
                </p>

                {/* Author + meta */}
                <div className="mt-auto flex items-center justify-between gap-2 pt-3 border-t border-border">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--pet-coral)] to-[var(--pet-mint)] flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {post.author.displayName?.[0] ?? "P"}
                        </div>
                        <span className="text-xs font-semibold text-foreground truncate">{post.author.displayName}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>👁 {post.viewCount}</span>
                        <span>{formatRelativeTime(post.createdAt)}</span>
                    </div>
                </div>
            </div>
        </article>
    );
};

export default PostCard;