import { Link } from "react-router";
import { Outlet } from "react-router";

const AuthLayout = () => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 via-background to-teal-50 dark:from-red-950/20 dark:via-background dark:to-teal-950/20 flex flex-col items-center justify-center p-4">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 mb-8 group">
                <span className="text-4xl group-hover:animate-bounce">🐾</span>
                <span
                    className="text-3xl font-black gradient-text"
                    style={{ fontFamily: "'Nunito', sans-serif" }}
                >
                    PetMart
                </span>
            </Link>

            {/* Content card */}
            <div className="w-full max-w-md bg-white dark:bg-card rounded-3xl shadow-xl border border-border p-8">
                <Outlet />
            </div>

            <p className="mt-6 text-xs text-muted-foreground">
                © {new Date().getFullYear()} PetMart. Mang người bạn bốn chân về nhà 🐾
            </p>
        </div>
    );
};

export default AuthLayout;