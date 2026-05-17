import { useState } from "react";
import type { User } from "@/types/user";
import { getAvatarLabel, getAvatarUrl } from "@/utils/avatar";

interface UserAvatarProps {
    user: Partial<User> | null | undefined;
    className?: string;
    fallbackClassName?: string;
}

const UserAvatar = ({ user, className = "w-8 h-8", fallbackClassName = "" }: UserAvatarProps) => {
    const avatarUrl = getAvatarUrl(user);
    const [failedAvatarUrl, setFailedAvatarUrl] = useState("");

    const baseClassName = `${className} rounded-full shrink-0 ring-2 ring-[var(--pet-coral)]/30`;

    if (avatarUrl && failedAvatarUrl !== avatarUrl) {
        return (
            <img
                src={avatarUrl}
                alt={user?.displayName || user?.username || user?.email || "Avatar"}
                className={`${baseClassName} object-cover`}
                onError={() => setFailedAvatarUrl(avatarUrl)}
            />
        );
    }

    return (
        <div className={`${baseClassName} bg-gradient-to-br from-[var(--pet-coral)] to-[var(--pet-mint)] flex items-center justify-center text-white font-bold ${fallbackClassName}`}>
            {getAvatarLabel(user)}
        </div>
    );
};

export default UserAvatar;
