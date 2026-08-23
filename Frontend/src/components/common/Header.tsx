import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Link, NavLink } from "react-router";
import {
    ChevronDown,
    LayoutDashboard,
    LogIn,
    LogOut,
    Menu,
    Moon,
    Package,
    PawPrint,
    Search,
    ShoppingCart,
    Sun,
    UserRound,
    X,
} from "lucide-react";

import { useCartStore } from "@/stores/useCartStore";
import { useUIStore } from "@/stores/useUIStore";
import { useAuthStore } from "@/stores/useAuthStore";
import UserAvatar from "@/components/common/UserAvatar";
import ProductSearchBox from "@/components/common/ProductSearchBox";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

const primaryNavigation = [
    { label: "Trang chủ", to: "/" },
    { label: "Cửa hàng", to: "/shop" },
    { label: "Blog", to: "/blog" },
    { label: "Về chúng tôi", to: "/about" },
];

type NavigationLinkProps = {
    label: string;
    to: string;
    onNavigate?: () => void;
    mobile?: boolean;
};

const NavigationLink = ({ label, to, onNavigate, mobile = false }: NavigationLinkProps) => (
    <NavLink
        to={to}
        end={to === "/"}
        onClick={onNavigate}
        className={({ isActive }) => mobile
            ? `flex min-h-11 items-center justify-between rounded-md px-3 text-sm font-medium transition-colors duration-base ease-standard ${
                isActive
                    ? "bg-primary-subtle font-semibold text-primary"
                    : "text-muted-foreground hover:bg-surface-subtle hover:text-text-strong"
            }`
            : `inline-flex min-h-11 items-center border-b-2 px-3 text-sm font-medium transition-colors duration-base ease-standard ${
                isActive
                    ? "border-primary font-semibold text-text-strong"
                    : "border-transparent text-muted-foreground hover:border-border-strong hover:text-text-strong"
            }`
        }
    >
        {({ isActive }) => (
            <>
                <span>{label}</span>
                {mobile && isActive && <span className="text-xs font-semibold" aria-hidden="true">Đang xem</span>}
            </>
        )}
    </NavLink>
);

const Header = () => {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [accountOpen, setAccountOpen] = useState(false);
    const accountMenuRef = useRef<HTMLDivElement>(null);
    const accountTriggerRef = useRef<HTMLButtonElement>(null);
    const focusFirstAccountItemRef = useRef(false);
    const accountMenuId = useId();
    const cartCount = useCartStore((state) => state.totalCount)();
    const { isDark, toggleDark } = useUIStore();
    const { user, signOut } = useAuthStore();
    const isAdmin = user?.role === "admin" || user?.role === "staff";

    useEffect(() => {
        if (!accountOpen) return;

        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target as Node;
            if (!accountMenuRef.current?.contains(target) && !accountTriggerRef.current?.contains(target)) {
                setAccountOpen(false);
            }
        };
        const handleKeyDown = (event: globalThis.KeyboardEvent) => {
            if (event.key === "Escape") {
                setAccountOpen(false);
                accountTriggerRef.current?.focus();
            }
        };

        document.addEventListener("pointerdown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);

        if (focusFirstAccountItemRef.current) {
            const frameId = window.requestAnimationFrame(() => {
                accountMenuRef.current?.querySelector<HTMLElement>("[role='menuitem']")?.focus();
                focusFirstAccountItemRef.current = false;
            });
            return () => {
                window.cancelAnimationFrame(frameId);
                document.removeEventListener("pointerdown", handlePointerDown);
                document.removeEventListener("keydown", handleKeyDown);
            };
        }

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [accountOpen]);

    const openAccountMenu = (focusFirstItem = false) => {
        focusFirstAccountItemRef.current = focusFirstItem;
        setAccountOpen(true);
    };

    const handleAccountTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            openAccountMenu(true);
        }
    };

    const handleAccountMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (!accountMenuRef.current || !["ArrowDown", "ArrowUp"].includes(event.key)) return;

        event.preventDefault();
        const items = Array.from(accountMenuRef.current.querySelectorAll<HTMLElement>("[role='menuitem']"));
        const currentIndex = items.indexOf(document.activeElement as HTMLElement);
        const delta = event.key === "ArrowDown" ? 1 : -1;
        const nextIndex = currentIndex === -1
            ? 0
            : (currentIndex + delta + items.length) % items.length;
        items[nextIndex]?.focus();
    };

    const handleSignOut = () => {
        setAccountOpen(false);
        setMobileOpen(false);
        void signOut();
    };

    const closeMobileNavigation = () => setMobileOpen(false);
    const cartLabel = cartCount > 0 ? `Giỏ hàng, ${cartCount} sản phẩm` : "Giỏ hàng trống";

    const accountNavigation = (mobile = false) => (
        <>
            <Link
                to="/profile"
                onClick={mobile ? closeMobileNavigation : () => setAccountOpen(false)}
                role={mobile ? undefined : "menuitem"}
                className={mobile
                    ? "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors duration-base hover:bg-surface-subtle hover:text-text-strong"
                    : "flex min-h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors duration-base hover:bg-primary-subtle hover:text-primary focus:bg-primary-subtle focus:text-primary"
                }
            >
                <UserRound className="size-4" aria-hidden="true" />
                Tài khoản
            </Link>
            <Link
                to="/orders"
                onClick={mobile ? closeMobileNavigation : () => setAccountOpen(false)}
                role={mobile ? undefined : "menuitem"}
                className={mobile
                    ? "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors duration-base hover:bg-surface-subtle hover:text-text-strong"
                    : "flex min-h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors duration-base hover:bg-primary-subtle hover:text-primary focus:bg-primary-subtle focus:text-primary"
                }
            >
                <Package className="size-4" aria-hidden="true" />
                Đơn hàng
            </Link>
            {isAdmin && (
                <Link
                    to="/admin"
                    onClick={mobile ? closeMobileNavigation : () => setAccountOpen(false)}
                    role={mobile ? undefined : "menuitem"}
                    className={mobile
                        ? "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold text-info transition-colors duration-base hover:bg-info-subtle hover:text-info-subtle-foreground"
                        : "flex min-h-10 items-center gap-3 rounded-md px-3 text-sm font-semibold text-info transition-colors duration-base hover:bg-info-subtle hover:text-info-subtle-foreground focus:bg-info-subtle"
                    }
                >
                    <LayoutDashboard className="size-4" aria-hidden="true" />
                    Trang quản trị
                </Link>
            )}
        </>
    );

    return (
        <header className="sticky top-0 z-sticky w-full border-b border-divider bg-surface/95 shadow-elevation-1">
            <div className="mx-auto max-w-[var(--content-max)] px-page">
                <div className="flex h-16 items-center gap-3 lg:h-[4.5rem]">
                    <Link to="/" className="flex min-h-11 shrink-0 items-center gap-2 rounded-md text-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-focus/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background">
                        <span className="flex size-9 items-center justify-center rounded-md bg-primary-subtle" aria-hidden="true">
                            <PawPrint className="size-5" />
                        </span>
                        <span className="font-heading text-xl font-extrabold tracking-tight sm:text-2xl">PetMart</span>
                    </Link>

                    <nav aria-label="Điều hướng chính" className="ml-4 hidden h-full items-center gap-1 lg:flex">
                        {primaryNavigation.map((link) => <NavigationLink key={link.to} {...link} />)}
                    </nav>

                    <div className="ml-auto flex items-center gap-1 sm:gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setSearchOpen((open) => !open)}
                            aria-label={searchOpen ? "Đóng tìm kiếm" : "Mở tìm kiếm"}
                            aria-expanded={searchOpen}
                            aria-controls="header-search-region"
                        >
                            {searchOpen ? <X aria-hidden="true" /> : <Search aria-hidden="true" />}
                        </Button>

                        <Button asChild variant="ghost" size="icon" className="relative hidden min-[360px]:inline-flex" aria-label={cartLabel}>
                            <Link to="/cart">
                                <ShoppingCart aria-hidden="true" />
                                {cartCount > 0 && (
                                    <span aria-hidden="true" className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold leading-none text-primary-foreground">
                                        {cartCount > 99 ? "99+" : cartCount}
                                    </span>
                                )}
                            </Link>
                        </Button>

                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="hidden min-[360px]:inline-flex"
                            onClick={toggleDark}
                            aria-label={isDark ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
                        >
                            {isDark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
                        </Button>

                        {user ? (
                            <div className="relative hidden lg:block">
                                <Button
                                    ref={accountTriggerRef}
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-11 max-w-48 justify-start px-2"
                                    onClick={() => accountOpen ? setAccountOpen(false) : openAccountMenu()}
                                    onKeyDown={handleAccountTriggerKeyDown}
                                    aria-haspopup="menu"
                                    aria-expanded={accountOpen}
                                    aria-controls={accountMenuId}
                                >
                                    <UserAvatar user={user} className="size-7" fallbackClassName="text-xs" />
                                    <span className="truncate">{user.displayName || user.username}</span>
                                    <ChevronDown className={`size-4 text-muted-foreground transition-transform duration-base ${accountOpen ? "rotate-180" : ""}`} aria-hidden="true" />
                                </Button>
                                {accountOpen && (
                                    <div
                                        ref={accountMenuRef}
                                        id={accountMenuId}
                                        role="menu"
                                        aria-label="Tài khoản"
                                        onKeyDown={handleAccountMenuKeyDown}
                                        className="absolute right-0 top-[calc(100%+0.5rem)] z-dropdown w-56 rounded-lg border border-border bg-surface-elevated p-2 shadow-elevation-3"
                                    >
                                        <div className="border-b border-divider px-3 py-2.5">
                                            <p className="truncate text-sm font-semibold text-text-strong">{user.displayName || user.username}</p>
                                            {user.email && <p className="mt-0.5 truncate text-xs text-muted-foreground">{user.email}</p>}
                                        </div>
                                        <div className="py-1">{accountNavigation()}</div>
                                        <div className="border-t border-divider pt-1">
                                            <button
                                                type="button"
                                                role="menuitem"
                                                onClick={handleSignOut}
                                                className="flex min-h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium text-destructive transition-colors duration-base hover:bg-destructive-subtle focus:bg-destructive-subtle"
                                            >
                                                <LogOut className="size-4" aria-hidden="true" />
                                                Đăng xuất
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <Button asChild className="hidden lg:inline-flex">
                                <Link to="/signin"><LogIn aria-hidden="true" />Đăng nhập</Link>
                            </Button>
                        )}

                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="lg:hidden"
                            onClick={() => setMobileOpen(true)}
                            aria-label="Mở menu điều hướng"
                            aria-expanded={mobileOpen}
                        >
                            <Menu aria-hidden="true" />
                        </Button>
                    </div>
                </div>

                {searchOpen && (
                    <div id="header-search-region" className="border-t border-divider py-3">
                        <ProductSearchBox
                            inputId="header-search-input"
                            autoFocus
                            wrapperClassName="w-full"
                            formClassName="flex flex-col gap-2 sm:flex-row"
                            inputClassName="h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-sm text-foreground placeholder:text-muted-foreground shadow-elevation-1 transition-[color,background-color,border-color,box-shadow] duration-base ease-standard focus:outline-none focus:border-focus focus:ring-[3px] focus:ring-focus/45"
                            buttonClassName="btn-pet-primary justify-center text-sm"
                            onSearchComplete={() => setSearchOpen(false)}
                        />
                    </div>
                )}
            </div>

            <Dialog
                open={mobileOpen}
                onOpenChange={setMobileOpen}
                title="Điều hướng"
                description="Khám phá PetMart, giỏ hàng và tài khoản của bạn."
                size="sm"
                className="ml-auto h-[100dvh] max-h-none w-full max-w-sm rounded-none sm:rounded-l-lg"
            >
                <nav aria-label="Điều hướng trên thiết bị nhỏ" className="flex flex-col gap-1">
                    {primaryNavigation.map((link) => (
                        <NavigationLink key={link.to} {...link} mobile onNavigate={closeMobileNavigation} />
                    ))}
                    <Link
                        to="/cart"
                        onClick={closeMobileNavigation}
                        className="flex min-h-11 items-center justify-between rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors duration-base hover:bg-surface-subtle hover:text-text-strong"
                    >
                        <span className="flex items-center gap-3"><ShoppingCart className="size-4" aria-hidden="true" />Giỏ hàng</span>
                        {cartCount > 0 && <span className="text-xs font-semibold text-primary">{cartCount}</span>}
                    </Link>
                    <button
                        type="button"
                        onClick={toggleDark}
                        className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium text-muted-foreground transition-colors duration-base hover:bg-surface-subtle hover:text-text-strong focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-focus/45"
                    >
                        {isDark ? <Sun className="size-4" aria-hidden="true" /> : <Moon className="size-4" aria-hidden="true" />}
                        {isDark ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
                    </button>
                </nav>

                <div className="my-5 border-t border-divider" />

                {user ? (
                    <div>
                        <div className="mb-2 flex items-center gap-3 px-3 py-2">
                            <UserAvatar user={user} className="size-9" fallbackClassName="text-sm" />
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-text-strong">{user.displayName || user.username}</p>
                                {user.email && <p className="truncate text-xs text-muted-foreground">{user.email}</p>}
                            </div>
                        </div>
                        <div className="flex flex-col gap-1">{accountNavigation(true)}</div>
                        <div className="mt-3 border-t border-divider pt-3">
                            <Button type="button" variant="ghost" className="w-full justify-start text-destructive hover:bg-destructive-subtle hover:text-destructive" onClick={handleSignOut}>
                                <LogOut aria-hidden="true" />Đăng xuất
                            </Button>
                        </div>
                    </div>
                ) : (
                    <Button asChild className="w-full justify-center" onClick={closeMobileNavigation}>
                        <Link to="/signin"><LogIn aria-hidden="true" />Đăng nhập</Link>
                    </Button>
                )}
            </Dialog>
        </header>
    );
};

export default Header;
