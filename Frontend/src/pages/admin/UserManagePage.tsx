import { useCallback, useEffect, useState, type FormEvent } from "react";
import { userService, type AdminUserPayload } from "@/services/userService";
import { useAuthStore } from "@/stores/useAuthStore";
import type { User } from "@/types/user";
import DataTable, { type Column } from "@/components/features/admin/DataTable";
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
    const [saving, setSaving] = useState(false);
    const [formOpen, setFormOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [form, setForm] = useState<UserFormState>(emptyForm);

    const loadUsers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await userService.getAllUsers(1, 100);
            setUsers(res.users);
        } catch {
            toast.error("Không thể tải danh sách người dùng.");
        } finally {
            setLoading(false);
        }
    }, []);

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
                const created = await userService.createUser(payload);
                setUsers((prev) => [created, ...prev]);
                toast.success("Đã tạo tài khoản.");
            }
            closeForm();
        } catch (err: unknown) {
            toast.error(getErrorMessage(err, "Không thể lưu người dùng. Vui lòng thử lại."));
        } finally {
            setSaving(false);
        }
    };

    const toggleBlock = async (targetUser: User) => {
        if (targetUser._id === currentUser?._id) {
            toast.error("Bạn không thể khóa tài khoản của chính mình.");
            return;
        }

        try {
            const updated = targetUser.isBlocked
                ? await userService.unblockUser(targetUser._id)
                : await userService.blockUser(targetUser._id);
            setUsers((prev) => prev.map((item) => item._id === updated._id ? updated : item));
            toast.success(updated.isBlocked ? "Đã khóa tài khoản." : "Đã mở khóa tài khoản.");
        } catch (err: unknown) {
            toast.error(getErrorMessage(err, "Không thể thay đổi trạng thái tài khoản."));
        }
    };

    const deactivateUser = async (targetUser: User) => {
        if (targetUser._id === currentUser?._id) {
            toast.error("Bạn không thể vô hiệu hóa tài khoản của chính mình.");
            return;
        }

        if (!confirm(`Vô hiệu hóa tài khoản "${targetUser.displayName}"?`)) return;

        try {
            const updated = await userService.deleteUser(targetUser._id);
            setUsers((prev) => prev.map((item) => item._id === updated._id ? updated : item));
            toast.success("Đã vô hiệu hóa tài khoản.");
        } catch (err: unknown) {
            toast.error(getErrorMessage(err, "Không thể vô hiệu hóa tài khoản."));
        }
    };

    const columns: Column<User>[] = [
        {
            key: "user",
            header: "Người dùng",
            render: (u) => (
                <div className="flex items-center gap-2 min-w-56">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--pet-coral)] to-[var(--pet-mint)] flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {u.displayName?.[0]?.toUpperCase() ?? u.username?.[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{u.displayName}</p>
                        <p className="text-xs text-muted-foreground truncate">@{u.username}</p>
                    </div>
                </div>
            ),
        },
        { key: "email", header: "Email", render: (u) => <span className="text-muted-foreground text-sm">{u.email}</span> },
        {
            key: "role",
            header: "Vai trò",
            render: (u) => (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${u.role === "admin" ? "bg-purple-100 text-purple-700" : u.role === "staff" ? "bg-blue-100 text-blue-700" : "bg-muted text-muted-foreground"}`}>
                    {u.role ?? "customer"}
                </span>
            ),
        },
        { key: "joined", header: "Ngày tham gia", render: (u) => formatDate(u.createdAt ?? "") },
        {
            key: "status",
            header: "Trạng thái",
            render: (u) => (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${u.isBlocked ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-700"}`}>
                    {u.isBlocked ? "Đã khóa" : "Hoạt động"}
                </span>
            ),
        },
    ];

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="section-title">👥 Quản Lý Người Dùng ({loading ? "..." : users.length})</h1>
                <button onClick={openCreateForm} className="btn-pet-primary">+ Thêm tài khoản</button>
            </div>

            {formOpen && (
                <div className="bg-white dark:bg-card rounded-2xl border border-border p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-3 mb-4">
                        <h2 className="font-bold text-foreground" style={{ fontFamily: "'Nunito', sans-serif" }}>
                            {editingUser ? "Sửa người dùng" : "Thêm tài khoản"}
                        </h2>
                        <button onClick={closeForm} className="text-xs px-3 py-1.5 bg-muted rounded-lg font-semibold">
                            Đóng
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input className="px-4 py-3 rounded-xl border border-border bg-muted/30 text-sm" placeholder="Username *" value={form.username} onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))} />
                        <input className="px-4 py-3 rounded-xl border border-border bg-muted/30 text-sm" type="email" placeholder="Email *" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
                        <input className="px-4 py-3 rounded-xl border border-border bg-muted/30 text-sm" placeholder="Tên hiển thị *" value={form.displayName} onChange={(e) => setForm((prev) => ({ ...prev, displayName: e.target.value }))} />
                        <select className="px-4 py-3 rounded-xl border border-border bg-muted/30 text-sm" value={form.role} onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value as UserRole }))} disabled={editingUser?._id === currentUser?._id}>
                            <option value="customer">customer</option>
                            <option value="staff">staff</option>
                            <option value="admin">admin</option>
                        </select>
                        {!editingUser && (
                            <input className="md:col-span-2 px-4 py-3 rounded-xl border border-border bg-muted/30 text-sm" type="password" placeholder="Mật khẩu tạm thời *" value={form.password} onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))} />
                        )}
                        <input className="px-4 py-3 rounded-xl border border-border bg-muted/30 text-sm" placeholder="Số điện thoại" value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} />
                        <input className="px-4 py-3 rounded-xl border border-border bg-muted/30 text-sm" placeholder="Địa chỉ" value={form.address} onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))} />
                        <textarea className="md:col-span-2 px-4 py-3 rounded-xl border border-border bg-muted/30 text-sm resize-none" rows={3} placeholder="Giới thiệu" value={form.bio} onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))} />
                        <div className="md:col-span-2 flex justify-end gap-2">
                            <button type="button" onClick={closeForm} className="btn-pet-secondary">Hủy</button>
                            <button type="submit" disabled={saving} className="btn-pet-primary disabled:opacity-50">
                                {saving ? "Đang lưu..." : editingUser ? "Cập nhật" : "Tạo tài khoản"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <DataTable
                columns={columns}
                data={users}
                keyExtractor={(u) => u._id}
                isLoading={loading}
                emptyText="Không có người dùng nào."
                actions={(u) => (
                    <div className="flex gap-2 justify-end flex-wrap">
                        <button onClick={() => openEditForm(u)} className="text-xs px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all font-semibold">Sửa</button>
                        <button onClick={() => toggleBlock(u)} className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${u.isBlocked ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-red-100 text-red-600 hover:bg-red-200"}`}>
                            {u.isBlocked ? "Mở khóa" : "Khóa"}
                        </button>
                        <button onClick={() => deactivateUser(u)} className="text-xs px-3 py-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all font-semibold">Vô hiệu hóa</button>
                    </div>
                )}
            />
        </div>
    );
};

export default UserManagePage;
