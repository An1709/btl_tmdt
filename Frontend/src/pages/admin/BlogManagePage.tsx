import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import DataTable, { DataTableActionGroup, DataTableConfirmAction, type Column } from "@/components/features/admin/DataTable";
import { AdminPageHeader, AdminPanel } from "@/components/features/admin/AdminSurface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Pagination from "@/components/common/Pagination";
import { postService, type PostPayload } from "@/services/postService";
import type { Post } from "@/types/post";
import { IMAGE_ASSETS } from "@/utils/constants";
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

const PAGE_SIZE = 20;

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

const BlogManagePage = () => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [formOpen, setFormOpen] = useState(false);
    const [editingPost, setEditingPost] = useState<Post | null>(null);
    const [form, setForm] = useState<BlogFormState>(emptyForm);

    const loadPosts = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        try {
            const res = await postService.getPosts(page, PAGE_SIZE);
            setPosts(res.data);
            setTotal(res.total);
            setTotalPages(res.totalPages);

            if (res.totalPages > 0 && page > res.totalPages) {
                setPage(res.totalPages);
            }
        } catch {
            setLoadError("Không thể tải danh sách bài viết. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    }, [page]);

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
            thumbnail: post.coverImage,
            tags: post.tags.join(", "),
            content: post.content,
        });
        setFormOpen(true);
    };

    const resetForm = () => {
        setFormOpen(false);
        setEditingPost(null);
        setForm(emptyForm);
    };

    const closeForm = () => {
        if (saving) return;
        resetForm();
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
            const isCreating = !editingPost;

            if (editingPost) {
                await postService.updatePost(editingPost._id, payload);
                toast.success("Đã cập nhật bài viết.");
            } else {
                await postService.createPost(payload);
                toast.success("Đã tạo bài viết.");
            }

            resetForm();
            if (isCreating && page !== 1) {
                setPage(1);
            } else {
                await loadPosts();
            }
        } catch (err: unknown) {
            toast.error(getErrorMessage(err, "Không thể lưu bài viết. Vui lòng thử lại."));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (post: Post) => {
        try {
            await postService.deletePost(post._id);
            toast.success("Đã xóa bài viết.");

            if (posts.length === 1 && page > 1) {
                setPage((current) => current - 1);
            } else {
                await loadPosts();
            }

            return true;
        } catch (err: unknown) {
            toast.error(getErrorMessage(err, "Không thể xóa bài viết. Vui lòng thử lại."));
            return false;
        }
    };

    const columns: Column<Post>[] = useMemo(() => [
        {
            key: "title",
            header: "Bài viết",
            render: (post) => (
                <div className="flex min-w-64 items-center gap-3">
                    <img src={post.coverImage || IMAGE_ASSETS.placeholder} alt="" className="size-12 rounded-md border border-border object-cover" />
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-text-strong line-clamp-1">{post.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{post.slug}</p>
                    </div>
                </div>
            ),
        },
        {
            key: "author",
            header: "Tác giả",
            hideOnMobile: true,
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
                        <Badge key={tag} tone="neutral">{tag}</Badge>
                    ))}
                    {post.tags.length > 2 && <span className="text-xs text-muted-foreground">+{post.tags.length - 2}</span>}
                </div>
            ),
        },
        {
            key: "views",
            header: "Lượt xem",
            hideOnMobile: true,
            render: (post) => <span className="text-sm font-semibold text-foreground">{post.viewCount}</span>,
        },
        {
            key: "createdAt",
            header: "Ngày tạo",
            render: (post) => <span className="text-sm text-muted-foreground">{new Date(post.createdAt).toLocaleDateString("vi-VN")}</span>,
        },
    ], []);

    const thumbnailError = form.thumbnail.trim() && !isValidImage(form.thumbnail)
        ? "Dùng URL http(s) hoặc đường dẫn bắt đầu bằng /."
        : undefined;

    return (
        <div className="flex flex-col gap-6">
            <AdminPageHeader
                title={`Quản lý bài viết${loading ? "" : ` (${total})`}`}
                description="Tạo và duy trì nội dung blog bằng định dạng bài viết hiện tại."
                actions={<Button type="button" onClick={openCreateForm}><Plus aria-hidden="true" />Thêm bài viết</Button>}
            />

            {formOpen && (
                <AdminPanel
                    title={editingPost ? "Chỉnh sửa bài viết" : "Thêm bài viết"}
                    description="Nội dung được lưu theo đúng định dạng văn bản hiện tại; không có trình soạn thảo mới hoặc chuyển đổi dữ liệu."
                    action={<Button type="button" variant="ghost" size="sm" onClick={closeForm} disabled={saving}>Đóng</Button>}
                >
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <FormField label="Tiêu đề" required>{(controlProps) => <Input {...controlProps} data-autofocus value={form.title} onChange={(event) => setForm((previous) => ({ ...previous, title: event.target.value }))} disabled={saving} />}</FormField>
                        <FormField label="URL ảnh đại diện" error={thumbnailError} description="Chỉ dùng URL hoặc đường dẫn hiện được API hỗ trợ.">{(controlProps) => <Input {...controlProps} type="url" inputMode="url" value={form.thumbnail} onChange={(event) => setForm((previous) => ({ ...previous, thumbnail: event.target.value }))} placeholder="https://…" disabled={saving} />}</FormField>
                        {form.thumbnail.trim() && isValidImage(form.thumbnail) && <img src={form.thumbnail.trim()} alt="Xem trước ảnh đại diện" className="h-40 w-56 rounded-md border border-border object-cover" />}
                        <FormField className="md:col-span-2" label="Thẻ" description="Nhập các thẻ, cách nhau bằng dấu phẩy.">{(controlProps) => <Input {...controlProps} value={form.tags} onChange={(event) => setForm((previous) => ({ ...previous, tags: event.target.value }))} disabled={saving} />}</FormField>
                        <FormField className="md:col-span-2" label="Tóm tắt">{(controlProps) => <Textarea {...controlProps} rows={3} value={form.excerpt} onChange={(event) => setForm((previous) => ({ ...previous, excerpt: event.target.value }))} disabled={saving} />}</FormField>
                        <FormField className="md:col-span-2" label="Nội dung bài viết" required>{(controlProps) => <Textarea {...controlProps} rows={12} className="min-h-72 resize-y leading-7" value={form.content} onChange={(event) => setForm((previous) => ({ ...previous, content: event.target.value }))} disabled={saving} />}</FormField>
                        <div className="flex flex-col-reverse justify-end gap-2 border-t border-divider pt-5 sm:col-span-2 sm:flex-row"><Button type="button" variant="outline" onClick={closeForm} disabled={saving}>Hủy</Button><Button type="submit" loading={saving}>{editingPost ? "Cập nhật bài viết" : "Tạo bài viết"}</Button></div>
                    </form>
                </AdminPanel>
            )}

            <DataTable
                columns={columns}
                data={posts}
                keyExtractor={(post) => post._id}
                isLoading={loading}
                error={loadError ? { description: loadError, action: <Button type="button" variant="outline" size="sm" onClick={() => void loadPosts()}>Thử lại</Button> } : null}
                emptyTitle="Chưa có bài viết"
                emptyText="Tạo bài viết đầu tiên để bắt đầu nội dung cho cửa hàng."
                tableLabel="Danh sách bài viết"
                actions={(post) => <DataTableActionGroup><Button type="button" variant="outline" size="sm" onClick={() => openEditForm(post)}>Sửa</Button><DataTableConfirmAction label="Xóa" title="Xóa bài viết" description={`Bạn sắp xóa “${post.title}”. Hành động này không thể hoàn tác.`} confirmLabel="Xóa bài viết" onConfirm={() => handleDelete(post)} /></DataTableActionGroup>}
            />
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </div>
    );
};

export default BlogManagePage;
