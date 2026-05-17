import type { User } from "@/types/user";

type AvatarUser = Partial<User> | null | undefined;

const isUsableAvatarUrl = (value?: string | null) => {
    if (!value) return false;

    const url = value.trim();
    return url.startsWith("http://")
        || url.startsWith("https://")
        || url.startsWith("/")
        || url.startsWith("data:image/");
};

export const getAvatarUrl = (user: AvatarUser) => {
    const avatarUrl = user?.avatarUrl || user?.avatar || user?.photoURL || user?.image || "";
    return isUsableAvatarUrl(avatarUrl) ? avatarUrl.trim() : "";
};

export const getAvatarLabel = (user: AvatarUser) => {
    const labelSource = user?.displayName || user?.username || user?.email || "U";
    return labelSource.trim().charAt(0).toUpperCase() || "U";
};
