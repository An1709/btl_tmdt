export interface User {
    _id: string;
    username: string;
    email: string;
    displayName: string;
    role?: 'customer' | 'admin' | 'staff';
    avatar?: string;
    avatarUrl?: string;
    photoURL?: string;
    image?: string;
    bio?: string;
    phone?: string;
    address?: string;
    isBlocked?: boolean;
    isEmailVerified?: boolean;
    createdAt?: string;
    updatedAt?: string;
}
