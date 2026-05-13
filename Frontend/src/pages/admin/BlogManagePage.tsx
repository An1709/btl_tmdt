import { useCallback, useEffect, useState, type FormEvent } from "react";
import DataTable, { type Column } from "@/components/features/admin/DataTable";
import { postService, type PostPayload } from "@/services/postService";
import type { Post } from "@/types/post";
import { toast } from "sonner";

interface BlogFormState {
    title: string;
    excerpt: string;
    thumbnail: string;
    tags: string;
    content: string;
}

const emptyForm: BlogFormState = {
    title: "",
    excerpt: "",
    thumbnail: "",
    tags: "",
    content: "",
};

const getErrorMessage = (err: unknown, fallback: string) => {
    if (err && typeof err === "object" && "response" in err) {
        return (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? fallback;
    }

    return fallback;
};

const isValidImage = (value: string) => {
    const image = value.trim();
    return !image || image.startsWith("http://") || image.startsWith("https://") || image.startsWith("/");
};

const editableThumbnail = (post: Post) => {
    const generatedListFallback = `https://images.unsplash.com/photo-${post._id}`;
    const generatedDetailFallback = "https://images.unsplash.com/photo-1450778869180-41d0601e046e";

    if (post.coverImage.startsWith(generatedListFallback) || post.coverImage.startsWith(generatedDetailFallback)) {
        return "";
    }

    return post.coverImage;
};

const BlogManagePage = () => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formOpen, setFormOpen] = useState(false);
    const [editingPost, setEditingPost] = useState<Post | null>(null);
    const [form, setForm] = useState<BlogFormState>(emptyForm);

    const loadPosts = useCallback(async () => {
        setLoading(true);
        try {
            const res = await postService.getPosts(1, 100);
            setPosts(res.data);
        } catch {
            toast.error("Không thể tải danh sách bài viết.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadPosts();
    }, [loadPosts]);

    const openCreateForm = () => {
        setEditingPost(null);
        setForm(emptyForm);
        setFormOpen(true);
    };

    const openEditForm = (post: Post) => {
        setEditingPost(post);
        setForm({
            title: post.title,
            excerpt: post.excerpt,
            thumbnail: editableThumbnail(post),
            tags: post.tags.join(", "),
            content: post.content,
        });
        setFormOpen(true);
    };

    const closeForm = () => {
        setFormOpen(false);
        setEditingPost(null);
        setForm(emptyForm);
    };

    const buildPayload = (): PostPayload | null => {
        if (!form.title.trim() || !form.content.trim()) {
            toast.error("Vui lòng nhập tiêu đề và nội dung bài viết.");
            return null;
        }

        if (!isValidImage(form.thumbnail)) {
            toast.error("Ảnh bài viết phải là URL hợp lệ hoặc đường dẫn bắt đầu bằng /.");
            return null;
        }

        return {
            title: form.title.trim(),
            content: form.content.trim(),
            excerpt: form.excerpt.trim(),
            thumbnail: form.thumbnail.trim(),
            tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
            type: "blog",
        };
    };

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        const payload = buildPayload();
        if (!payload) return;

        try {
            setSaving(true);
            if (editingPost) {
                const updated = await postService.updatePost(editingPost._id, payload);
                setPosts((prev) => prev.map((post) => post._id === updated._id ? updated : post));
                toast.success("Đã cập nhật bài viết.");
            } else {
                const created = await postService.createPost(payload);
                setPosts((prev) => [created, ...prev]);
                toast.success("Đã tạo bài viết.");
            }
            closeForm();
        } catch (err: unknown) {
            toast.error(getErrorMessage(err, "Không thể lưu bài viết. Vui lòng thử lại."));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (post: Post) => {
        if (!confirm(`Bạn có chắc muốn xóa bài viết "${post.title}"?`)) return;

        try {
            await postService.deletePost(post._id);
            setPosts((prev) => prev.filter((item) => item._id !== post._id));
            toast.success("Đã xóa bài viết.");
        } catch (err: unknown) {
            toast.error(getErrorMessage(err, "Không thể xóa bài viết. Vui lòng thử lại."));
        }
    };

    const columns: Column<Post>[] = [
        {
            key: "title",
            header: "Bài viết",
            render: (post) => (
                <div className="flex items-center gap-3 min-w-64">
                    <img src={post.coverImage || "/placeholder.png"} alt={post.title} className="w-12 h-12 rounded-xl object-cover border border-border" />
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground line-clamp-1">{post.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{post.slug}</p>
                    </div>
                </div>
            ),
        },
        {
            key: "author",
            header: "Tác giả",
            render: (post) => (
                <span className="text-sm text-foreground">
                    {post.author?.displayName || post.author?.username || "Admin"}
                </span>
            ),
        },
        {
            key: "tags",
            header: "Thẻ",
            render: (post) => (
                <div className="flex flex-wrap gap-1">
                    {post.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="badge-new">{tag}</span>
                    ))}
                    {post.tags.length > 2 && <span className="text-xs text-muted-foreground">+{post.tags.length - 2}</span>}
                </div>
            ),
        },
        {
            key: "views",
            header: "Lượt xem",
            render: (post) => <span className="text-sm font-semibold text-foreground">{post.viewCount}</span>,
        },
        {
            key: "createdAt",
            header: "Ngày tạo",
            render: (post) => <span className="text-sm text-muted-foreground">{new Date(post.createdAt).toLocaleDateString("vi-VN")}</span>,
        },
    ];

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="section-title">
                    Quản Lý Bài Viết ({loading ? "..." : posts.length})
                </h1>
                <button onClick={openCreateForm} className="btn-pet-primary">+ Thêm bài viết</button>
            </div>

            {formOpen && (
                <div className="bg-white dark:bg-card rounded-2xl border border-border p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-3 mb-4">
                        <h2 className="font-bold text-foreground" style={{ fontFamily: "'Nunito', sans-serif" }}>
                            {editingPost ? "Sửa bài viết" : "Thêm bài viết"}
                        </h2>
                        <button onClick={closeForm} className="text-xs px-3 py-1.5 bg-muted rounded-lg font-semibold">
                            Đóng
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input className="px-4 py-3 rounded-xl border border-border bg-muted/30 text-sm" placeholder="Tiêu đề *" value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} />
                        <input className="px-4 py-3 rounded-xl border border-border bg-muted/30 text-sm" placeholder="URL ảnh đại diện" value={form.thumbnail} onChange={(e) => setForm((prev) => ({ ...prev, thumbnail: e.target.value }))} />
                        <input className="md:col-span-2 px-4 py-3 rounded-xl border border-border bg-muted/30 text-sm" placeholder="Thẻ, cách nhau bằng dấu phẩy" value={form.tags} onChange={(e) => setForm((prev) => ({ ...prev, tags: e.target.value }))} />
                        <textarea className="md:col-span-2 px-4 py-3 rounded-xl border border-border bg-muted/30 text-sm resize-none" rows={2} placeholder="Tóm tắt" value={form.excerpt} onChange={(e) => setForm((prev) => ({ ...prev, excerpt: e.target.value }))} />
                        <textarea className="md:col-span-2 px-4 py-3 rounded-xl border border-border bg-muted/30 text-sm resize-y min-h-56" rows={8} placeholder="Nội dung *" value={form.content} onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))} />
                        <div className="md:col-span-2 flex justify-end gap-2">
                            <button type="button" onClick={closeForm} className="btn-pet-secondary">Hủy</button>
                            <button type="submit" disabled={saving} className="btn-pet-primary disabled:opacity-50">
                                {saving ? "Đang lưu..." : editingPost ? "Cập nhật" : "Tạo bài viết"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <DataTable
                columns={columns}
                data={posts}
                keyExtractor={(post) => post._id}
                isLoading={loading}
                emptyText="Không có bài viết nào."
                actions={(post) => (
                    <div className="flex gap-2 justify-end">
                        <button onClick={() => openEditForm(post)} className="text-xs px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all font-semibold">Sửa</button>
                        <button onClick={() => handleDelete(post)} className="text-xs px-3 py-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all font-semibold">Xóa</button>
                    </div>
                )}
            />
        </div>
    );
};

export default BlogManagePage;
