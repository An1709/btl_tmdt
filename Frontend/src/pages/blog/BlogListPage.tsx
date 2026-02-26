import { useEffect, useState } from "react";
import { postService } from "@/services/postService";
import type { Post } from "@/types/post";
import PostCard from "@/components/features/blog/PostCard";
import Pagination from "@/components/common/Pagination";
import Loading from "@/components/common/Loading";
import { useDebounce } from "@/hooks/useDebounce";

const BlogListPage = () => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const debouncedSearch = useDebounce(search, 400);
    const limit = 9;

    useEffect(() => {
        setLoading(true);
        postService.getPosts(page, limit, debouncedSearch)
            .then((res) => { setPosts(res.data); setTotal(res.total); })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [page, debouncedSearch]);

    const totalPages = Math.ceil(total / limit);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8 text-center">
                <h1 className="section-title mb-2">📝 Blog PetMart</h1>
                <p className="text-muted-foreground text-sm">Mẹo chăm sóc thú cưng, tin tức và nhiều hơn nữa</p>
            </div>

            {/* Search */}
            <div className="relative max-w-lg mx-auto mb-10">
                <input
                    type="text"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    placeholder="🔍 Tìm kiếm bài viết..."
                    className="w-full px-5 py-3 pl-12 rounded-2xl border border-border bg-white dark:bg-card text-sm
                     focus:outline-none focus:ring-2 focus:ring-[var(--pet-coral)]/40 focus:border-[var(--pet-coral)] transition-all shadow-sm"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">🔍</span>
            </div>

            {loading ? <Loading /> : posts.length === 0 ? (
                <div className="text-center py-16">
                    <div className="text-5xl mb-3">📝</div>
                    <p className="text-muted-foreground">Không tìm thấy bài viết nào.</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {posts.map((post) => <PostCard key={post._id} post={post} />)}
                    </div>
                    <Pagination page={page} totalPages={totalPages} onChange={setPage} />
                </>
            )}
        </div>
    );
};

export default BlogListPage;