import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Plus, Search } from "lucide-react";
import { userService, type AdminUserPayload } from "@/services/userService";
import { useAuthStore } from "@/stores/useAuthStore";
import type { User } from "@/types/user";
import DataTable, { DataTableActionGroup, DataTableConfirmAction, type Column } from "@/components/features/admin/DataTable";
import { AdminPageHeader, AdminPanel } from "@/components/features/admin/AdminSurface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import Pagination from "@/components/common/Pagination";
import { formatDate } from "@/utils/format";
import { toast } from "sonner";

type UserRole = "customer" | "admin" | "staff";

interface UserFormState {
    username: string;
    email: string;
    displayName: string;
    role: UserRole;
    phone: string;
    address: string;
    bio: string;
    password: string;
}

const emptyForm: UserFormState = {
    username: "",
    email: "",
    displayName: "",
    role: "customer",
    phone: "",
    address: "",
    bio: "",
    password: "",
};

const USERS_PER_PAGE = 20;

const getErrorMessage = (err: unknown, fallback: string) => {
    if (err && typeof err === "object" && "response" in err) {
        return (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? fallback;
    }

    return fallback;
};

const UserManagePage = () => {
    const { user: currentUser } = useAuthStore();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [mutatingId, setMutatingId] = useState<string | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [form, setForm] = useState<UserFormState>(emptyForm);
    const [page, setPage] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchTerm, setSearchTerm] = useState("");

    const loadUsers = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        try {
            const res = await userService.getAllUsers(page, USERS_PER_PAGE, searchTerm);
            setUsers(res.users);
            setTotalUsers(res.total);
        } catch {
            setLoadError("Không thể tải danh sách người dùng. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    }, [page, searchTerm]);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    const openCreateForm = () => {
        setEditingUser(null);
        setForm(emptyForm);
        setFormOpen(true);
    };

    const openEditForm = (user: User) => {
        setEditingUser(user);
        setForm({
            username: user.username,
            email: user.email,
            displayName: user.displayName,
            role: user.role ?? "customer",
            phone: user.phone ?? "",
            address: user.address ?? "",
            bio: user.bio ?? "",
            password: "",
        });
        setFormOpen(true);
    };

    const closeForm = () => {
        if (saving) return;
        setFormOpen(false);
        setEditingUser(null);
        setForm(emptyForm);
    };

    const buildPayload = (): AdminUserPayload | null => {
        if (!form.username.trim() || !form.email.trim() || !form.displayName.trim()) {
            toast.error("Vui lòng nhập username, email và tên hiển thị.");
            return null;
        }

        if (!editingUser && form.password.length < 6) {
            toast.error("Mật khẩu tài khoản mới phải có ít nhất 6 ký tự.");
            return null;
        }

        return {
            username: form.username.trim(),
            email: form.email.trim(),
            displayName: form.displayName.trim(),
            role: form.role,
            phone: form.phone.trim(),
            address: form.address.trim(),
            bio: form.bio.trim(),
            ...(editingUser ? {} : { password: form.password }),
        };
    };

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        const payload = buildPayload();
        if (!payload) return;

        try {
            setSaving(true);
            if (editingUser) {
                const updated = await userService.updateUser(editingUser._id, payload);
                setUsers((prev) => prev.map((item) => item._id === updated._id ? updated : item));
                toast.success("Đã cập nhật người dùng.");
            } else {
                await userService.createUser(payload);
                toast.success("Đã tạo tài khoản.");
                const queryWillReset = page !== 1 || searchTerm !== "";
                setPage(1);
                setSearchQuery("");
                setSearchTerm("");
                if (!queryWillReset) await loadUsers();
            }
            setFormOpen(false);
            setEditingUser(null);
            setForm(emptyForm);
        } catch (err: unknown) {
            toast.error(getErrorMessage(err, "Không thể lưu người dùng. Vui lòng thử lại."));
        } finally {
            setSaving(false);
        }
    };

    const toggleBlock = async (targetUser: User) => {
        if (targetUser._id === currentUser?._id) {
            toast.error("Bạn không thể khóa tài khoản của chính mình.");
            return false;
        }

        try {
            setMutatingId(targetUser._id);
            const updated = targetUser.isBlocked
                ? await userService.unblockUser(targetUser._id)
                : await userService.blockUser(targetUser._id);
            setUsers((prev) => prev.map((item) => item._id === updated._id ? updated : item));
            toast.success(updated.isBlocked ? "Đã khóa tài khoản." : "Đã mở khóa tài khoản.");
            return true;
        } catch (err: unknown) {
            toast.error(getErrorMessage(err, "Không thể thay đổi trạng thái tài khoản."));
            return false;
        } finally {
            setMutatingId(null);
        }
    };

    const totalPages = Math.max(1, Math.ceil(totalUsers / USERS_PER_PAGE));

    const runSearch = () => {
        setSearchTerm(searchQuery.trim());
        setPage(1);
    };

    const columns: Column<User>[] = useMemo(() => [
        {
            key: "user",
            header: "Người dùng",
            render: (u) => (
                <div className="flex min-w-56 items-center gap-2">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-xs font-semibold text-primary-subtle-foreground">
                        {u.displayName?.[0]?.toUpperCase() ?? u.username?.[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-text-strong">{u.displayName}</p>
                        <p className="text-xs text-muted-foreground truncate">@{u.username}</p>
                        {u._id === currentUser?._id && <Badge tone="info" className="mt-1">Bạn</Badge>}
                    </div>
                </div>
            ),
        },
        { key: "email", header: "Email", render: (u) => <span className="break-all text-sm text-muted-foreground">{u.email}</span> },
        {
            key: "role",
            header: "Vai trò",
            render: (u) => (
                <Badge tone={u.role === "admin" ? "warning" : u.role === "staff" ? "info" : "neutral"}>{u.role ?? "customer"}</Badge>
            ),
        },
        {
            key: "loyalty",
            header: "Thành viên",
            render: (u) => (
                <div className="text-xs">
                    <p className="font-bold text-foreground">{u.membershipLevel ?? "Đồng"}</p>
                    <p className="text-muted-foreground">{u.loyaltyPoints ?? 0} điểm</p>
                </div>
            ),
        },
        { key: "joined", header: "Ngày tham gia", hideOnMobile: true, render: (u) => formatDate(u.createdAt ?? "") },
        {
            key: "status",
            header: "Trạng thái",
            render: (u) => (
                <Badge tone={u.isBlocked ? "error" : "success"}>{u.isBlocked ? "Đã khóa" : "Hoạt động"}</Badge>
            ),
        },
    ], [currentUser?._id]);

    return (
        <div className="flex flex-col gap-6">
            <AdminPageHeader title={`Quản lý người dùng${loading ? "" : ` (${totalUsers})`}`} description="Quản lý thông tin, vai trò và trạng thái truy cập; tài khoản đang đăng nhập luôn được bảo vệ khỏi thao tác nguy hiểm." actions={<Button type="button" onClick={openCreateForm}><Plus aria-hidden="true" />Thêm tài khoản</Button>} />

            <AdminPanel title="Tìm người dùng" description="Tìm theo tên đăng nhập, email hoặc tên hiển thị trên toàn bộ dữ liệu máy chủ.">
                <div className="flex w-full flex-col gap-2 sm:max-w-xl sm:flex-row">
                    <Input
                        type="search"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        onKeyDown={(event) => { if (event.key === "Enter") runSearch(); }}
                        placeholder="Tên đăng nhập, email hoặc tên hiển thị"
                        aria-label="Tìm kiếm người dùng"
                    />
                    <Button type="button" variant="outline" onClick={runSearch}><Search aria-hidden="true" />Tìm</Button>
                </div>
            </AdminPanel>

            {formOpen && (
                <AdminPanel title={editingUser ? "Chỉnh sửa người dùng" : "Thêm tài khoản"} description="Các trường và vai trò được gửi đúng theo contract quản trị hiện tại." action={<Button type="button" variant="ghost" size="sm" onClick={closeForm} disabled={saving}>Đóng</Button>}>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <FormField label="Tên đăng nhập" required>{(controlProps) => <Input {...controlProps} data-autofocus autoComplete="off" value={form.username} onChange={(event) => setForm((previous) => ({ ...previous, username: event.target.value }))} disabled={saving} />}</FormField>
                        <FormField label="Email" required>{(controlProps) => <Input {...controlProps} type="email" autoComplete="off" value={form.email} onChange={(event) => setForm((previous) => ({ ...previous, email: event.target.value }))} disabled={saving} />}</FormField>
                        <FormField label="Tên hiển thị" required>{(controlProps) => <Input {...controlProps} value={form.displayName} onChange={(event) => setForm((previous) => ({ ...previous, displayName: event.target.value }))} disabled={saving} />}</FormField>
                        <FormField label="Vai trò" description={editingUser?._id === currentUser?._id ? "Không thể tự thay đổi vai trò của tài khoản đang đăng nhập." : "Vai trò quyết định quyền truy cập hiện có."}>{(controlProps) => <Select {...controlProps} value={form.role} onChange={(event) => setForm((previous) => ({ ...previous, role: event.target.value as UserRole }))} disabled={saving || editingUser?._id === currentUser?._id}><option value="customer">customer</option><option value="staff">staff</option><option value="admin">admin</option></Select>}</FormField>
                        {!editingUser && <FormField className="md:col-span-2" label="Mật khẩu tạm thời" required description="Tối thiểu 6 ký tự theo quy tắc hiện tại.">{(controlProps) => <Input {...controlProps} type="password" autoComplete="new-password" value={form.password} onChange={(event) => setForm((previous) => ({ ...previous, password: event.target.value }))} disabled={saving} />}</FormField>}
                        <FormField label="Số điện thoại">{(controlProps) => <Input {...controlProps} type="tel" autoComplete="off" value={form.phone} onChange={(event) => setForm((previous) => ({ ...previous, phone: event.target.value }))} disabled={saving} />}</FormField>
                        <FormField label="Địa chỉ">{(controlProps) => <Input {...controlProps} value={form.address} onChange={(event) => setForm((previous) => ({ ...previous, address: event.target.value }))} disabled={saving} />}</FormField>
                        <FormField className="md:col-span-2" label="Giới thiệu">{(controlProps) => <Textarea {...controlProps} rows={4} value={form.bio} onChange={(event) => setForm((previous) => ({ ...previous, bio: event.target.value }))} disabled={saving} />}</FormField>
                        <div className="flex flex-col-reverse justify-end gap-2 border-t border-divider pt-5 md:col-span-2 sm:flex-row"><Button type="button" variant="outline" onClick={closeForm} disabled={saving}>Hủy</Button><Button type="submit" loading={saving}>{editingUser ? "Cập nhật người dùng" : "Tạo tài khoản"}</Button></div>
                    </form>
                </AdminPanel>
            )}

            <DataTable
                columns={columns}
                data={users}
                keyExtractor={(u) => u._id}
                isLoading={loading}
                error={loadError ? { description: loadError, action: <Button type="button" variant="outline" size="sm" onClick={() => void loadUsers()}>Thử lại</Button> } : null}
                emptyTitle={searchTerm ? "Không tìm thấy người dùng" : "Chưa có người dùng"}
                emptyText={searchTerm ? "Thử một tên, email hoặc tên hiển thị khác." : "Tạo tài khoản đầu tiên hoặc kiểm tra lại dữ liệu từ máy chủ."}
                tableLabel="Danh sách người dùng quản trị"
                actions={(user) => (
                    <DataTableActionGroup>
                        <Button type="button" variant="outline" size="sm" onClick={() => openEditForm(user)}>Sửa</Button>
                        {user._id === currentUser?._id ? (
                            <span className="max-w-40 text-xs leading-5 text-muted-foreground">Tài khoản hiện tại được bảo vệ</span>
                        ) : user.isBlocked ? (
                            <Button type="button" variant="outline" size="sm" loading={mutatingId === user._id} onClick={() => void toggleBlock(user)}>Mở khóa</Button>
                        ) : (
                            <DataTableConfirmAction label="Khóa" title="Khóa tài khoản" description={`Tài khoản “${user.displayName}” sẽ không thể tiếp tục truy cập cho đến khi được mở khóa.`} confirmLabel="Khóa tài khoản" disabled={mutatingId === user._id} onConfirm={() => toggleBlock(user)} />
                        )}
                    </DataTableActionGroup>
                )}
            />
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </div>
    );
};

export default UserManagePage;
