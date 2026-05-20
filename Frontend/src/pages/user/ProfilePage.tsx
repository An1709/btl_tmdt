import { useEffect, useRef, useState } from "react";
import Sidebar from "@/components/common/Sidebar";
import { useAuthStore } from "@/stores/useAuthStore";
import { userService } from "@/services/userService";
import { toast } from "sonner";
import UserAvatar from "@/components/common/UserAvatar";

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

const MEMBERSHIP_NEXT_POINTS: Record<string, number | null> = {
    Đồng: 100,
    Bạc: 300,
    Vàng: 700,
    "Kim cương": null,
};

const ProfilePage = () => {
    const { user, fetchMe, setUser } = useAuthStore();
    const [form, setForm] = useState({
        displayName: user?.displayName ?? "",
        bio: user?.bio ?? "",
        phone: user?.phone ?? "",
    });
    const [selectedAvatar, setSelectedAvatar] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState("");
    const avatarPreviewRef = useRef("");
    const [saving, setSaving] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [oldPwd, setOldPwd] = useState("");
    const [newPwd, setNewPwd] = useState("");
    const [changingPwd, setChangingPwd] = useState(false);

    useEffect(() => () => {
        if (avatarPreviewRef.current) {
            URL.revokeObjectURL(avatarPreviewRef.current);
        }
    }, []);

    const inputCls = "w-full px-4 py-3 rounded-xl border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pet-coral)]/40 focus:border-[var(--pet-coral)] transition-all placeholder:text-muted-foreground";
    const loyaltyPoints = user?.loyaltyPoints ?? 0;
    const membershipLevel = user?.membershipLevel ?? "Đồng";
    const nextLevelPoints = MEMBERSHIP_NEXT_POINTS[membershipLevel];
    const previousLevelPoints = membershipLevel === "Đồng" ? 0 : membershipLevel === "Bạc" ? 100 : membershipLevel === "Vàng" ? 300 : 700;
    const progressPercent = nextLevelPoints
        ? Math.min(Math.max(((loyaltyPoints - previousLevelPoints) / (nextLevelPoints - previousLevelPoints)) * 100, 0), 100)
        : 100;

    const clearAvatarSelection = () => {
        setSelectedAvatar(null);
        setAvatarPreview("");
        if (avatarPreviewRef.current) {
            URL.revokeObjectURL(avatarPreviewRef.current);
            avatarPreviewRef.current = "";
        }
    };

    const handleAvatarSelect = (file?: File) => {
        if (!file) return;

        if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
            clearAvatarSelection();
            toast.error("Vui lòng chọn tệp ảnh hợp lệ.");
            return;
        }

        if (file.size > MAX_AVATAR_SIZE) {
            clearAvatarSelection();
            toast.error("Ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn 5MB.");
            return;
        }

        if (avatarPreviewRef.current) {
            URL.revokeObjectURL(avatarPreviewRef.current);
        }

        const previewUrl = URL.createObjectURL(file);
        avatarPreviewRef.current = previewUrl;
        setAvatarPreview(previewUrl);
        setSelectedAvatar(file);
    };

    const uploadSelectedAvatar = async () => {
        if (!selectedAvatar) {
            toast.error("Vui lòng chọn tệp ảnh hợp lệ.");
            return null;
        }

        setUploadingAvatar(true);
        try {
            const updatedUser = await userService.updateAvatar(selectedAvatar);
            setUser(updatedUser);
            clearAvatarSelection();
            toast.success("Cập nhật ảnh đại diện thành công.");
            return updatedUser;
        } catch {
            toast.error("Không thể cập nhật ảnh đại diện. Vui lòng thử lại.");
            return null;
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await userService.updateProfile(form);

            if (selectedAvatar) {
                const updatedUser = await uploadSelectedAvatar();
                if (!updatedUser) return;
            } else {
                await fetchMe?.();
            }

            toast.success("Cập nhật thông tin thành công!");
        } catch {
            toast.error("Không thể cập nhật. Vui lòng thử lại.");
        } finally {
            setSaving(false);
        }
    };

    const handleChangePwd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!oldPwd || !newPwd) return;
        setChangingPwd(true);
        try {
            await userService.changePassword(oldPwd, newPwd);
            toast.success("Đổi mật khẩu thành công!");
            setOldPwd("");
            setNewPwd("");
        } catch {
            toast.error("Mật khẩu cũ không đúng hoặc đã xảy ra lỗi.");
        } finally {
            setChangingPwd(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex gap-8">
            <Sidebar mode="user" />
            <main className="flex-1 flex flex-col gap-6">
                <h1 className="section-title">👤 Tài Khoản</h1>

                <div className="bg-white dark:bg-card rounded-2xl border border-border p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <p className="text-sm text-muted-foreground">Điểm thành viên</p>
                            <p className="text-3xl font-black text-[var(--pet-coral)]">{loyaltyPoints}</p>
                        </div>
                        <div className="md:text-right">
                            <p className="text-sm text-muted-foreground">Hạng thành viên</p>
                            <p className="text-2xl font-black text-foreground">{membershipLevel}</p>
                        </div>
                    </div>
                    <div className="mt-5">
                        <div className="h-3 rounded-full bg-muted overflow-hidden">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-[var(--pet-coral)] to-[var(--pet-mint)] transition-all"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                            {nextLevelPoints
                                ? `Còn ${Math.max(nextLevelPoints - loyaltyPoints, 0)} điểm để lên hạng tiếp theo.`
                                : "Bạn đang ở hạng thành viên cao nhất."}
                        </p>
                    </div>
                </div>

                <div className="bg-white dark:bg-card rounded-2xl border border-border p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
                        {avatarPreview ? (
                            <img
                                src={avatarPreview}
                                alt="Xem trước ảnh đại diện"
                                className="w-16 h-16 rounded-full object-cover shrink-0 ring-2 ring-[var(--pet-coral)]/30"
                            />
                        ) : (
                            <UserAvatar user={user} className="w-16 h-16" fallbackClassName="text-2xl" />
                        )}
                        <div className="min-w-0 flex-1">
                            <p className="font-bold text-foreground truncate">{user?.displayName || user?.username}</p>
                            <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
                            {selectedAvatar && (
                                <p className="text-xs text-[var(--pet-coral)] mt-1 truncate">{selectedAvatar.name}</p>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <label className="btn-pet-secondary text-sm cursor-pointer">
                                Chọn ảnh
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    className="sr-only"
                                    onChange={(e) => handleAvatarSelect(e.target.files?.[0])}
                                />
                            </label>
                            <button
                                type="button"
                                onClick={() => void uploadSelectedAvatar()}
                                disabled={!selectedAvatar || uploadingAvatar || saving}
                                className="btn-pet-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {uploadingAvatar ? "Đang tải ảnh đại diện..." : "Cập nhật ảnh đại diện"}
                            </button>
                        </div>
                    </div>

                    <h2 className="font-bold mb-4" style={{ fontFamily: "'Nunito', sans-serif" }}>Thông tin cá nhân</h2>
                    <form onSubmit={handleSave} className="flex flex-col gap-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Email</label>
                                <input className={inputCls} value={user?.email ?? ""} disabled />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Tên hiển thị</label>
                                <input className={inputCls} placeholder="Tên của bạn" value={form.displayName} onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))} />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Số điện thoại</label>
                                <input className={inputCls} placeholder="0912 345 678" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Giới thiệu</label>
                            <textarea className={`${inputCls} resize-none`} rows={3} placeholder="Vài dòng về bạn..." value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} />
                        </div>
                        <div className="flex justify-end">
                            <button type="submit" disabled={saving || uploadingAvatar} className="btn-pet-primary disabled:opacity-50">
                                {saving ? "Đang lưu..." : "Lưu thay đổi"}
                            </button>
                        </div>
                    </form>
                </div>

                <div className="bg-white dark:bg-card rounded-2xl border border-border p-6">
                    <h2 className="font-bold mb-4" style={{ fontFamily: "'Nunito', sans-serif" }}>🔒 Đổi mật khẩu</h2>
                    <form onSubmit={handleChangePwd} className="flex flex-col gap-4 max-w-md">
                        <input type="password" className={inputCls} placeholder="Mật khẩu hiện tại" value={oldPwd} onChange={(e) => setOldPwd(e.target.value)} />
                        <input type="password" className={inputCls} placeholder="Mật khẩu mới" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
                        <div className="flex justify-end">
                            <button type="submit" disabled={changingPwd || !oldPwd || !newPwd} className="btn-pet-secondary disabled:opacity-50">{changingPwd ? "Đang xử lý..." : "Đổi mật khẩu"}</button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default ProfilePage;
