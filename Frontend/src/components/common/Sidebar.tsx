import { NavLink } from "react-router";
import { useAuthStore } from "@/stores/useAuthStore";
import UserAvatar from "@/components/common/UserAvatar";

interface SidebarProps {
    mode?: "admin" | "user";
}

const adminLinks = [
    { to: "/admin", label: "Tổng quan", emoji: "📊", end: true },
    { to: "/admin/products", label: "Sản phẩm", emoji: "🐾" },
    { to: "/admin/blogs", label: "Bài viết", emoji: "📝" },
    { to: "/admin/orders", label: "Đơn hàng", emoji: "📦" },
    { to: "/admin/users", label: "Người dùng", emoji: "👥" },
    { to: "/admin/coupons", label: "Mã giảm giá", emoji: "🎟️" },
    { to: "/admin/reviews", label: "Đánh giá", emoji: "⭐" },
    { to: "/admin/warranty", label: "Bảo hành", emoji: "🛡️" },
    { to: "/admin/ai-model", label: "Huấn luyện mô hình", emoji: "🧠" },
];

const userLinks = [
    { to: "/profile", label: "Tài khoản", emoji: "👤", end: true },
    { to: "/orders", label: "Đơn hàng", emoji: "📦" },
    { to: "/wishlist", label: "Yêu thích", emoji: "❤️" },
    { to: "/warranty", label: "Bảo hành", emoji: "🛡️" },
];

const Sidebar = ({ mode = "user" }: SidebarProps) => {
    const { user } = useAuthStore();
    const links = mode === "admin" ? adminLinks : userLinks;

    return (
        <aside className="w-64 shrink-0 hidden lg:block">
            <div className="sticky top-24 bg-white dark:bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
                {/* User info */}
                <div className="p-4 border-b border-border bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-950/30 dark:to-transparent">
                    <div className="flex items-center gap-3">
                        <UserAvatar user={user} className="w-10 h-10" />
                        <div className="min-w-0">
                            <p className="font-bold text-sm text-foreground truncate">
                                {user?.displayName || user?.username}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                        </div>
                    </div>
                </div>

                {/* Nav links */}
                <nav className="p-2">
                    {links.map((link) => (
                        <NavLink
                            key={link.to}
                            to={link.to}
                            end={link.end}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold
                 transition-all duration-150 mb-0.5
                 ${isActive
                                    ? "bg-[var(--pet-coral)] text-white shadow-sm"
                                    : "text-muted-foreground hover:text-[var(--pet-coral)] hover:bg-red-50 dark:hover:bg-red-950/30"
                                }`
                            }
                        >
                            <span className="text-base">{link.emoji}</span>
                            {link.label}
                        </NavLink>
                    ))}
                </nav>
            </div>
        </aside>
    );
};

export default Sidebar;
