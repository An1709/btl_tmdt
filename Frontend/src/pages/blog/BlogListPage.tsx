import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { postService } from "@/services/postService";
import type { Post } from "@/types/post";
import PostCard from "@/components/features/blog/PostCard";
import Pagination from "@/components/common/Pagination";
import { SkeletonBlock } from "@/components/common/Loading";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/feedback-state";
import { FormField } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/useDebounce";

const limit = 9;

const BlogListPage = () => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [retryNonce, setRetryNonce] = useState(0);
    const debouncedSearch = useDebounce(search, 400);

    useEffect(() => {
        let isMounted = true;

        const loadPosts = async () => {
            setLoading(true);
            setError("");

            try {
                const res = await postService.getPosts(page, limit, debouncedSearch);
                if (isMounted) {
                    setPosts(res.data);
                    setTotal(res.total);
                }
            } catch {
                if (isMounted) {
                    setPosts([]);
                    setTotal(0);
                    setError("Không thể tải danh sách bài viết. Vui lòng thử lại sau.");
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        void loadPosts();

        return () => {
            isMounted = false;
        };
    }, [page, debouncedSearch, retryNonce]);

    const totalPages = Math.ceil(total / limit);
    const hasSearch = search.trim().length > 0;

    return (
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <header className="mx-auto mb-9 max-w-3xl text-center">
                <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-primary">Pet care library</p>
                <h1 className="text-3xl font-semibold tracking-tight text-text-strong sm:text-4xl">Blog PetMart</h1>
                <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">Mẹo chăm sóc thú cưng, hướng dẫn mua sắm và những câu chuyện hữu ích cho mỗi ngày.</p>
            </header>

            <section aria-labelledby="blog-search-heading" className="mx-auto mb-10 max-w-2xl rounded-xl border border-border bg-surface p-4 sm:p-5">
                <h2 id="blog-search-heading" className="sr-only">Tìm kiếm bài viết</h2>
                <FormField label="Tìm kiếm bài viết" description="Nhập từ khóa để lọc bài viết theo tiêu đề hoặc nội dung." id="blog-search">
                    {(controlProps) => (
                        <div className="relative">
                            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input {...controlProps} type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Ví dụ: dinh dưỡng cho chó..." className="pl-10 pr-11" />
                            {search && <Button type="button" variant="ghost" size="icon-sm" aria-label="Xóa tìm kiếm" className="absolute right-1 top-1/2 -translate-y-1/2" onClick={() => { setSearch(""); setPage(1); }}><X aria-hidden="true" /></Button>}
                        </div>
                    )}
                </FormField>
            </section>

            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h2 className="text-xl font-semibold text-text-strong">Bài viết mới nhất</h2>
                    {!loading && !error && total > 0 && <p className="mt-1 text-sm text-muted-foreground">{total} bài viết{hasSearch ? ` phù hợp với “${search.trim()}”` : ""}</p>}
                </div>
                {loading && <span className="text-sm text-muted-foreground" role="status" aria-live="polite">Đang tải bài viết…</span>}
            </div>

            {loading ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-label="Đang tải bài viết" aria-busy="true">
                    {Array.from({ length: 6 }, (_, index) => <div key={index} className="overflow-hidden rounded-xl border border-border bg-surface"><SkeletonBlock className="aspect-video rounded-none" /><div className="space-y-3 p-5"><SkeletonBlock className="h-5 w-4/5" /><SkeletonBlock className="h-4 w-full" /><SkeletonBlock className="h-4 w-2/3" /><SkeletonBlock className="mt-5 h-4 w-1/2" /></div></div>)}
                </div>
            ) : error ? (
                <ErrorState title="Không tải được bài viết" description={error} action={<Button onClick={() => setRetryNonce((value) => value + 1)}>Thử lại</Button>} />
            ) : posts.length === 0 ? (
                <EmptyState title={hasSearch ? "Không tìm thấy bài viết phù hợp" : "Chưa có bài viết nào"} description={hasSearch ? "Thử một từ khóa khác hoặc xóa bộ lọc tìm kiếm để xem toàn bộ bài viết." : "Nội dung mới sẽ được cập nhật tại đây."} action={hasSearch ? <Button variant="outline" onClick={() => { setSearch(""); setPage(1); }}>Xóa tìm kiếm</Button> : undefined} />
            ) : (
                <>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">{posts.map((post) => <PostCard key={post._id} post={post} />)}</div>
                    {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onChange={setPage} />}
                </>
            )}
        </div>
    );
};

export default BlogListPage;
