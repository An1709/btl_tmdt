import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useCartStore } from "@/stores/useCartStore";
import { useUIStore } from "@/stores/useUIStore";
import { useAuthStore } from "@/stores/useAuthStore";

const Header = () => {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const cartCount = useCartStore((s) => s.totalCount)();
    const { isDark, toggleDark } = useUIStore();
    const { user, signOut } = useAuthStore();
    const navigate = useNavigate();

    const navLinks = [
        { label: "Trang Chủ", to: "/" },
        { label: "Cửa Hàng", to: "/shop" },
        { label: "Blog", to: "/blog" },
        { label: "Về Chúng Tôi", to: "/about" },
    ];

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/shop?q=${encodeURIComponent(searchQuery.trim())}`);
            setSearchOpen(false);
        }
    };

    return (
        <header className="sticky top-0 z-50 w-full">
            {/* Glass backdrop */}
            <div className="bg-white/90 dark:bg-card/95 backdrop-blur-xl border-b border-border/50 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16 md:h-18">

                        {/* ===== LOGO ===== */}
                        <Link to="/" className="flex items-center gap-2 shrink-0 group">
                            <span className="text-3xl group-hover:animate-bounce transition-all select-none">🐾</span>
                            <span
                                className="text-xl md:text-2xl font-black gradient-text select-none"
                                style={{ fontFamily: "'Nunito', sans-serif" }}
                            >
                                PetMart
                            </span>
                        </Link>

                        {/* ===== DESKTOP NAV ===== */}
                        <nav className="hidden md:flex items-center gap-1">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.to}
                                    to={link.to}
                                    className="px-4 py-2 rounded-xl text-sm font-semibold text-muted-foreground
                             hover:text-[var(--pet-coral)] hover:bg-red-50 dark:hover:bg-red-950/30
                             transition-all duration-200"
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </nav>

                        {/* ===== RIGHT ACTIONS ===== */}
                        <div className="flex items-center gap-1 md:gap-2">

                            {/* Search button */}
                            <button
                                id="header-search-btn"
                                onClick={() => setSearchOpen((p) => !p)}
                                className="p-2.5 rounded-xl text-muted-foreground hover:text-[var(--pet-coral)] hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
                                aria-label="Tìm kiếm"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </button>

                            {/* Cart button */}
                            <Link
                                to="/cart"
                                id="header-cart-btn"
                                className="relative p-2.5 rounded-xl text-muted-foreground hover:text-[var(--pet-coral)] hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
                                aria-label="Giỏ hàng"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                {cartCount > 0 && (
                                    <span className="absolute -top-1 -right-1 min-w-[20px] h-5 flex items-center justify-center
                                   bg-[var(--pet-coral)] text-white text-xs font-bold rounded-full px-1
                                   animate-pulse-soft">
                                        {cartCount > 99 ? "99+" : cartCount}
                                    </span>
                                )}
                            </Link>

                            {/* Dark mode toggle */}
                            <button
                                id="header-darkmode-btn"
                                onClick={toggleDark}
                                className="p-2.5 rounded-xl text-muted-foreground hover:text-[var(--pet-coral)] hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
                                aria-label={isDark ? "Chế độ sáng" : "Chế độ tối"}
                            >
                                {isDark ? (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                    </svg>
                                )}
                            </button>

                            {/* User avatar / Login */}
                            {user ? (
                                <div className="relative group hidden md:block">
                                    <button
                                        id="header-user-btn"
                                        className="flex items-center gap-2 pl-1 pr-3 py-1.5 rounded-xl
                               hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
                                    >
                                        {user.avatarUrl ? (
                                            <img src={user.avatarUrl} alt={user.displayName} className="w-8 h-8 rounded-full object-cover ring-2 ring-[var(--pet-coral)]/30" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--pet-coral)] to-[var(--pet-mint)] flex items-center justify-center text-white text-sm font-bold">
                                                {(user.displayName || user.username)?.[0]?.toUpperCase()}
                                            </div>
                                        )}
                                        <span className="text-sm font-semibold text-foreground">{user.displayName || user.username}</span>
                                        <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                    {/* Dropdown */}
                                    <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-card border border-border rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                                        <div className="p-2">
                                            <Link to="/profile" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-[var(--pet-coral)] transition-colors">
                                                <span>👤</span> Tài khoản
                                            </Link>
                                            <Link to="/orders" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-[var(--pet-coral)] transition-colors">
                                                <span>📦</span> Đơn hàng
                                            </Link>
                                            <hr className="my-1 border-border" />
                                            <button
                                                onClick={() => signOut()}
                                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                                            >
                                                <span>🚪</span> Đăng xuất
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <Link
                                    to="/signin"
                                    id="header-login-btn"
                                    className="hidden md:flex btn-pet-primary text-sm py-2 px-4"
                                >
                                    Đăng nhập
                                </Link>
                            )}

                            {/* Mobile hamburger */}
                            <button
                                id="header-hamburger-btn"
                                onClick={() => setMobileOpen((p) => !p)}
                                className="md:hidden p-2.5 rounded-xl text-muted-foreground hover:text-[var(--pet-coral)] hover:bg-red-50 transition-all"
                                aria-label="Menu"
                            >
                                {mobileOpen ? (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* ===== SEARCH BAR (expanded) ===== */}
                    {searchOpen && (
                        <div className="pb-3 animate-fade-in-up">
                            <form onSubmit={handleSearch} className="flex gap-2">
                                <input
                                    autoFocus
                                    type="text"
                                    id="header-search-input"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Tìm thú cưng, phụ kiện..."
                                    className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-muted/50 text-sm
                             focus:outline-none focus:ring-2 focus:ring-[var(--pet-coral)]/40 focus:border-[var(--pet-coral)]
                             transition-all placeholder:text-muted-foreground"
                                />
                                <button type="submit" className="btn-pet-primary py-2 px-5 text-sm">Tìm</button>
                            </form>
                        </div>
                    )}
                </div>

                {/* ===== MOBILE NAV ===== */}
                {mobileOpen && (
                    <div className="md:hidden border-t border-border bg-white/98 dark:bg-card/98 animate-fade-in-up">
                        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-1">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.to}
                                    to={link.to}
                                    onClick={() => setMobileOpen(false)}
                                    className="px-4 py-3 rounded-xl font-semibold text-muted-foreground
                             hover:text-[var(--pet-coral)] hover:bg-red-50 transition-all"
                                >
                                    {link.label}
                                </Link>
                            ))}
                            <hr className="my-1 border-border" />
                            {user ? (
                                <button
                                    onClick={() => { signOut(); setMobileOpen(false); }}
                                    className="px-4 py-3 rounded-xl font-semibold text-red-500 hover:bg-red-50 text-left transition-all"
                                >
                                    🚪 Đăng xuất
                                </button>
                            ) : (
                                <Link
                                    to="/signin"
                                    onClick={() => setMobileOpen(false)}
                                    className="btn-pet-primary justify-center text-sm"
                                >
                                    Đăng nhập
                                </Link>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
};

export default Header;