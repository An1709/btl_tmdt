import { useAuthStore } from "@/stores/useAuthStore";

/**
 * Convenience hook that exposes the auth store state
 * with a computed isAuthenticated field.
 */
export const useAuth = () => {
    const { user, accessToken, loading, signIn, signOut, signUp, fetchMe, refresh } =
        useAuthStore();

    return {
        user,
        accessToken,
        loading,
        isAuthenticated: !!accessToken && !!user,
        isAdmin: (user as unknown as { role?: string })?.role === "admin",
        signIn,
        signOut,
        signUp,
        fetchMe,
        refresh,
    };
};