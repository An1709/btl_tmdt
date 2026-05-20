import type { User } from "@/types/user";
import { API_URL } from "@/utils/constants";

type AvatarUser = Partial<User> | null | undefined;

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const isUsableAvatarUrl = (value?: string | null) => {
    if (!value) return false;

    const url = value.trim();
    return url.startsWith("http://")
        || url.startsWith("https://")
        || url.startsWith("/")
        || url.startsWith("uploads/")
        || url.startsWith("Backend/uploads/")
        || url.startsWith("data:image/");
};

const resolveLocalUploadUrl = (value: string) => {
    const normalized = value.trim().replace(/\\/g, "/");
    const uploadIndex = normalized.indexOf("uploads/");
    if (uploadIndex === -1) return normalized;

    const uploadPath = `/${normalized.slice(uploadIndex)}`;
    const apiBase = API_URL ? trimTrailingSlash(API_URL) : window.location.origin;

    return `${apiBase}${uploadPath}`;
};

export const getAvatarUrl = (user: AvatarUser) => {
    const avatarUrl = user?.avatarUrl || user?.avatar || user?.photoURL || user?.image || "";
    if (!isUsableAvatarUrl(avatarUrl)) return "";

    const trimmedAvatarUrl = avatarUrl.trim();
    if (
        trimmedAvatarUrl.startsWith("/uploads/")
        || trimmedAvatarUrl.startsWith("uploads/")
        || trimmedAvatarUrl.startsWith("Backend/uploads/")
    ) {
        return resolveLocalUploadUrl(trimmedAvatarUrl);
    }

    return trimmedAvatarUrl;
};

export const getAvatarLabel = (user: AvatarUser) => {
    const labelSource = user?.displayName || user?.username || user?.email || "U";
    return labelSource.trim().charAt(0).toUpperCase() || "U";
};
