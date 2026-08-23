import { useEffect, useMemo, useRef, useState } from "react";
import { Award, Camera, RotateCcw, ShieldCheck, Upload } from "lucide-react";
import { toast } from "sonner";

import { PasswordInput } from "@/components/auth/auth-form-support";
import Sidebar from "@/components/common/Sidebar";
import UserAvatar from "@/components/common/UserAvatar";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { userService } from "@/services/userService";
import { useAuthStore } from "@/stores/useAuthStore";

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

const MEMBERSHIP_NEXT_POINTS: Record<string, number | null> = {
    Đồng: 100,
    Bạc: 300,
    Vàng: 700,
    "Kim cương": null,
};

type ProfileFormValues = {
    displayName: string;
    phone: string;
    address: string;
    bio: string;
};

const getErrorMessage = (error: unknown, fallback: string) => {
    const message = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
    return typeof message === "string" ? message : fallback;
};

const isCurrentAuthUser = (userId: string) => useAuthStore.getState().user?._id === userId;

const ProfilePage = () => {
    const { user, setUser } = useAuthStore();
    const profileDisplayName = user?.displayName ?? "";
    const profilePhone = user?.phone ?? "";
    const profileAddress = user?.address ?? "";
    const profileBio = user?.bio ?? "";
    const syncedProfileForm = useMemo(
        () => ({
            displayName: profileDisplayName,
            phone: profilePhone,
            address: profileAddress,
            bio: profileBio,
        }),
        [profileAddress, profileBio, profileDisplayName, profilePhone]
    );
    const [form, setForm] = useState<ProfileFormValues>(() => syncedProfileForm);
    const [selectedAvatar, setSelectedAvatar] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState("");
    const avatarPreviewRef = useRef("");
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const [saving, setSaving] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [profileError, setProfileError] = useState("");
    const [avatarError, setAvatarError] = useState("");
    const [oldPwd, setOldPwd] = useState("");
    const [newPwd, setNewPwd] = useState("");
    const [changingPwd, setChangingPwd] = useState(false);
    const [passwordError, setPasswordError] = useState("");

    useEffect(() => {
        setForm(syncedProfileForm);
    }, [syncedProfileForm]);

    useEffect(() => () => {
        if (avatarPreviewRef.current) {
            URL.revokeObjectURL(avatarPreviewRef.current);
        }
    }, []);

    const loyaltyPoints = user?.loyaltyPoints ?? 0;
    const membershipLevel = user?.membershipLevel ?? "Đồng";
    const nextLevelPoints = MEMBERSHIP_NEXT_POINTS[membershipLevel];
    const previousLevelPoints = membershipLevel === "Đồng" ? 0 : membershipLevel === "Bạc" ? 100 : membershipLevel === "Vàng" ? 300 : 700;
    const progressPercent = nextLevelPoints
        ? Math.min(Math.max(((loyaltyPoints - previousLevelPoints) / (nextLevelPoints - previousLevelPoints)) * 100, 0), 100)
        : 100;
    const pointsToNextLevel = nextLevelPoints
        ? Math.max(user?.pointsToNextLevel ?? nextLevelPoints - loyaltyPoints, 0)
        : 0;
    const isProfileDirty = Object.entries(form).some(([key, value]) => value !== syncedProfileForm[key as keyof ProfileFormValues]);

    const clearAvatarSelection = () => {
        setSelectedAvatar(null);
        setAvatarPreview("");
        setAvatarError("");
        if (avatarPreviewRef.current) {
            URL.revokeObjectURL(avatarPreviewRef.current);
            avatarPreviewRef.current = "";
        }
        if (avatarInputRef.current) avatarInputRef.current.value = "";
    };

    const handleAvatarSelect = (file?: File) => {
        if (!file) return;

        if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
            clearAvatarSelection();
            const message = "Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP.";
            setAvatarError(message);
            toast.error(message);
            return;
        }

        if (file.size > MAX_AVATAR_SIZE) {
            clearAvatarSelection();
            const message = "Ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn 5 MB.";
            setAvatarError(message);
            toast.error(message);
            return;
        }

        if (avatarPreviewRef.current) URL.revokeObjectURL(avatarPreviewRef.current);

        const previewUrl = URL.createObjectURL(file);
        avatarPreviewRef.current = previewUrl;
        setAvatarPreview(previewUrl);
        setSelectedAvatar(file);
        setAvatarError("");
    };

    const uploadSelectedAvatar = async () => {
        const avatarFile = selectedAvatar;
        const requestUserId = user?._id;
        if (!avatarFile) return true;
        if (!requestUserId) return false;

        setUploadingAvatar(true);
        setAvatarError("");

        try {
            const updatedUser = await userService.updateAvatar(avatarFile);
            if (!isCurrentAuthUser(requestUserId)) return false;

            setUser(updatedUser);
            clearAvatarSelection();
            return true;
        } catch (error) {
            if (!isCurrentAuthUser(requestUserId)) return false;

            const message = getErrorMessage(error, "Không thể cập nhật ảnh đại diện. Vui lòng thử lại.");
            setAvatarError(message);
            toast.error(message);
            return false;
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handleAvatarUpload = async () => {
        const uploaded = await uploadSelectedAvatar();
        if (uploaded && selectedAvatar) toast.success("Cập nhật ảnh đại diện thành công.");
    };

    const handleSave = async (event: React.FormEvent) => {
        event.preventDefault();
        setProfileError("");

        const requestUserId = user?._id;
        if (!requestUserId) {
            setProfileError("Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại.");
            return;
        }

        if (!form.displayName.trim()) {
            setProfileError("Tên hiển thị không được để trống.");
            return;
        }

        setSaving(true);
        try {
            const updatedUser = await userService.updateProfile(form);
            if (!isCurrentAuthUser(requestUserId)) return;

            setUser(updatedUser);

            if (selectedAvatar) {
                const uploaded = await uploadSelectedAvatar();
                if (!isCurrentAuthUser(requestUserId)) return;
                if (!uploaded) {
                    setProfileError("Thông tin đã được lưu nhưng ảnh đại diện chưa thể tải lên.");
                    return;
                }
            }

            toast.success("Cập nhật thông tin thành công.");
        } catch (error) {
            if (!isCurrentAuthUser(requestUserId)) return;

            const message = getErrorMessage(error, "Không thể cập nhật thông tin. Vui lòng thử lại.");
            setProfileError(message);
            toast.error(message);
        } finally {
            setSaving(false);
        }
    };

    const handleChangePwd = async (event: React.FormEvent) => {
        event.preventDefault();
        setPasswordError("");

        if (!oldPwd || !newPwd) {
            setPasswordError("Vui lòng nhập mật khẩu hiện tại và mật khẩu mới.");
            return;
        }

        if (newPwd.length < 6) {
            setPasswordError("Mật khẩu mới phải có ít nhất 6 ký tự.");
            return;
        }

        if (oldPwd === newPwd) {
            setPasswordError("Mật khẩu mới phải khác mật khẩu hiện tại.");
            return;
        }

        setChangingPwd(true);
        try {
            await userService.changePassword(oldPwd, newPwd);
            toast.success("Đổi mật khẩu thành công.");
            setOldPwd("");
            setNewPwd("");
        } catch (error) {
            const message = getErrorMessage(error, "Mật khẩu hiện tại không đúng hoặc đã xảy ra lỗi.");
            setPasswordError(message);
            toast.error(message);
        } finally {
            setChangingPwd(false);
        }
    };

    return (
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-page py-8 lg:flex-row lg:gap-8">
            <Sidebar mode="user" />

            <section className="min-w-0 flex-1 space-y-6" aria-labelledby="profile-heading">
                <header className="max-w-2xl">
                    <h1 id="profile-heading" className="font-heading text-2xl font-bold tracking-tight text-text-strong sm:text-3xl">
                        Tài khoản của bạn
                    </h1>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        Quản lý thông tin cá nhân, ảnh đại diện và bảo mật tài khoản.
                    </p>
                </header>

                <section className="border border-border bg-surface-elevated p-5 sm:p-6" aria-labelledby="membership-heading">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                                <Award className="size-4" aria-hidden="true" />
                                Thành viên {membershipLevel}
                            </div>
                            <h2 id="membership-heading" className="mt-2 text-2xl font-bold text-text-strong">
                                {loyaltyPoints.toLocaleString("vi-VN")} điểm
                            </h2>
                            <p className="mt-1 text-sm text-muted-foreground">Điểm thành viên hiện có của bạn.</p>
                        </div>

                        <div className="w-full max-w-md sm:pt-1">
                            <div className="flex items-center justify-between gap-4 text-sm">
                                <span className="font-medium text-text-strong">Tiến độ hạng thành viên</span>
                                <span className="shrink-0 text-muted-foreground">{Math.round(progressPercent)}%</span>
                            </div>
                            <div
                                className="mt-2 h-2 overflow-hidden rounded-full bg-surface-subtle"
                                role="progressbar"
                                aria-label="Tiến độ hạng thành viên"
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={Math.round(progressPercent)}
                            >
                                <div className="h-full rounded-full bg-primary transition-[width] duration-base ease-standard" style={{ width: `${progressPercent}%` }} />
                            </div>
                            <p className="mt-2 text-sm text-muted-foreground">
                                {nextLevelPoints
                                    ? `Còn ${pointsToNextLevel.toLocaleString("vi-VN")} điểm để lên hạng tiếp theo.`
                                    : "Bạn đang ở hạng thành viên cao nhất."}
                            </p>
                        </div>
                    </div>
                </section>

                <section className="border border-border bg-surface-elevated p-5 sm:p-6" aria-labelledby="avatar-heading">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                        {avatarPreview ? (
                            <img src={avatarPreview} alt="Xem trước ảnh đại diện" className="size-20 shrink-0 rounded-full border border-border object-cover" />
                        ) : (
                            <UserAvatar user={user} className="size-20" fallbackClassName="text-2xl" />
                        )}

                        <div className="min-w-0 flex-1">
                            <h2 id="avatar-heading" className="text-base font-semibold text-text-strong">Ảnh đại diện</h2>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                Dùng ảnh JPG, PNG hoặc WebP, dung lượng tối đa 5 MB.
                            </p>
                            {selectedAvatar && <p className="mt-2 truncate text-sm font-medium text-primary">Đã chọn: {selectedAvatar.name}</p>}
                            {avatarError && <p role="alert" className="mt-2 text-sm text-destructive">{avatarError}</p>}
                        </div>

                        <div className="flex flex-wrap gap-2 sm:justify-end">
                            <Button asChild variant="outline">
                                <label htmlFor="profile-avatar-input" className="cursor-pointer">
                                    <Camera aria-hidden="true" />
                                    Chọn ảnh
                                </label>
                            </Button>
                            {selectedAvatar && (
                                <Button type="button" variant="ghost" onClick={clearAvatarSelection} disabled={uploadingAvatar || saving}>
                                    Hủy chọn
                                </Button>
                            )}
                            <Button
                                type="button"
                                onClick={() => void handleAvatarUpload()}
                                loading={uploadingAvatar}
                                disabled={!selectedAvatar || saving}
                            >
                                <Upload aria-hidden="true" />
                                Tải ảnh lên
                            </Button>
                        </div>
                    </div>

                    <input
                        ref={avatarInputRef}
                        id="profile-avatar-input"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        onChange={(event) => handleAvatarSelect(event.target.files?.[0])}
                    />
                </section>

                <section className="border border-border bg-surface-elevated p-5 sm:p-6" aria-labelledby="personal-details-heading">
                    <div className="max-w-2xl">
                        <h2 id="personal-details-heading" className="text-lg font-semibold text-text-strong">Thông tin cá nhân</h2>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                            Email và tên đăng nhập được quản lý bởi hệ thống nên không thể thay đổi tại đây.
                        </p>
                    </div>

                    <form className="mt-6 space-y-5" onSubmit={handleSave} noValidate>
                        <div className="grid gap-5 sm:grid-cols-2">
                            <FormField label="Email" description="Không thể thay đổi">
                                {(controlProps) => <Input type="email" value={user?.email ?? ""} disabled {...controlProps} />}
                            </FormField>
                            <FormField label="Tên đăng nhập" description="Không thể thay đổi">
                                {(controlProps) => <Input value={user?.username ?? ""} disabled {...controlProps} />}
                            </FormField>
                        </div>

                        <div className="grid gap-5 sm:grid-cols-2">
                            <FormField label="Tên hiển thị" error={profileError === "Tên hiển thị không được để trống." ? profileError : undefined} required>
                                {(controlProps) => (
                                    <Input
                                        placeholder="Tên của bạn"
                                        value={form.displayName}
                                        disabled={saving || uploadingAvatar}
                                        onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))}
                                        {...controlProps}
                                    />
                                )}
                            </FormField>
                            <FormField label="Số điện thoại">
                                {(controlProps) => (
                                    <Input
                                        type="tel"
                                        inputMode="tel"
                                        autoComplete="tel"
                                        placeholder="0912 345 678"
                                        value={form.phone}
                                        disabled={saving || uploadingAvatar}
                                        onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                                        {...controlProps}
                                    />
                                )}
                            </FormField>
                        </div>

                        <FormField label="Địa chỉ" description="Thông tin này được dùng cho hồ sơ của bạn.">
                            {(controlProps) => (
                                <Input
                                    autoComplete="street-address"
                                    placeholder="Nhập địa chỉ của bạn"
                                    value={form.address}
                                    disabled={saving || uploadingAvatar}
                                    onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
                                    {...controlProps}
                                />
                            )}
                        </FormField>

                        <FormField label="Giới thiệu">
                            {(controlProps) => (
                                <Textarea
                                    rows={4}
                                    placeholder="Vài dòng về bạn"
                                    value={form.bio}
                                    disabled={saving || uploadingAvatar}
                                    onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))}
                                    {...controlProps}
                                />
                            )}
                        </FormField>

                        {profileError && profileError !== "Tên hiển thị không được để trống." && (
                            <p role="alert" className="rounded-md border border-destructive/30 bg-destructive-subtle px-3.5 py-3 text-sm text-destructive-subtle-foreground">
                                {profileError}
                            </p>
                        )}

                        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => {
                                    setForm(syncedProfileForm);
                                    setProfileError("");
                                }}
                                disabled={!isProfileDirty || saving || uploadingAvatar}
                            >
                                <RotateCcw aria-hidden="true" />
                                Hoàn tác
                            </Button>
                            <Button type="submit" loading={saving} disabled={uploadingAvatar || (!isProfileDirty && !selectedAvatar)}>
                                Lưu thay đổi
                            </Button>
                        </div>
                    </form>
                </section>

                <section className="border border-border bg-surface-elevated p-5 sm:p-6" aria-labelledby="security-heading">
                    <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-primary-subtle text-primary" aria-hidden="true">
                            <ShieldCheck className="size-5" />
                        </span>
                        <div className="max-w-2xl">
                            <h2 id="security-heading" className="text-lg font-semibold text-text-strong">Bảo mật tài khoản</h2>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                Đổi mật khẩu tách biệt với thông tin cá nhân để tránh lưu nhầm thay đổi.
                            </p>
                        </div>
                    </div>

                    <form className="mt-6 max-w-xl space-y-5" onSubmit={handleChangePwd} noValidate>
                        <FormField label="Mật khẩu hiện tại" required>
                            {(controlProps) => (
                                <PasswordInput
                                    autoComplete="current-password"
                                    placeholder="Nhập mật khẩu hiện tại"
                                    disabled={changingPwd}
                                    value={oldPwd}
                                    onChange={(event) => setOldPwd(event.target.value)}
                                    {...controlProps}
                                />
                            )}
                        </FormField>

                        <FormField label="Mật khẩu mới" required>
                            {(controlProps) => (
                                <PasswordInput
                                    autoComplete="new-password"
                                    placeholder="Nhập mật khẩu mới"
                                    disabled={changingPwd}
                                    value={newPwd}
                                    onChange={(event) => setNewPwd(event.target.value)}
                                    {...controlProps}
                                />
                            )}
                        </FormField>

                        {passwordError && (
                            <p role="alert" className="rounded-md border border-destructive/30 bg-destructive-subtle px-3.5 py-3 text-sm text-destructive-subtle-foreground">
                                {passwordError}
                            </p>
                        )}

                        <Button type="submit" variant="outline" loading={changingPwd} disabled={!oldPwd || !newPwd}>
                            Đổi mật khẩu
                        </Button>
                    </form>
                </section>
            </section>
        </div>
    );
};

export default ProfilePage;
