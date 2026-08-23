import type { LucideIcon } from "lucide-react";
import {
  BrainCircuit,
  FileText,
  Heart,
  LayoutDashboard,
  Package,
  ShieldCheck,
  ShoppingCart,
  Star,
  TicketPercent,
  UserRound,
  UsersRound,
  Wrench,
} from "lucide-react";
import { NavLink } from "react-router";

import UserAvatar from "@/components/common/UserAvatar";
import { Dialog } from "@/components/ui/dialog";
import { useAuthStore } from "@/stores/useAuthStore";

interface SidebarProps {
  mode?: "admin" | "user";
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}

type NavigationLink = {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
};

const adminLinks: NavigationLink[] = [
  { to: "/admin", label: "Tổng quan", icon: LayoutDashboard, end: true },
  { to: "/admin/products", label: "Sản phẩm", icon: Package },
  { to: "/admin/blogs", label: "Bài viết", icon: FileText },
  { to: "/admin/orders", label: "Đơn hàng", icon: ShoppingCart },
  { to: "/admin/users", label: "Người dùng", icon: UsersRound },
  { to: "/admin/coupons", label: "Mã giảm giá", icon: TicketPercent },
  { to: "/admin/reviews", label: "Đánh giá", icon: Star },
  { to: "/admin/warranty", label: "Bảo hành", icon: Wrench },
  { to: "/admin/ai-model", label: "Huấn luyện mô hình", icon: BrainCircuit },
];

const userLinks: NavigationLink[] = [
  { to: "/profile", label: "Tài khoản", icon: UserRound, end: true },
  { to: "/orders", label: "Đơn hàng", icon: Package },
  { to: "/wishlist", label: "Yêu thích", icon: Heart },
  { to: "/warranty", label: "Bảo hành", icon: ShieldCheck },
];

function UserNavigationLink({ link, compact = false }: { link: NavigationLink; compact?: boolean }) {
  const Icon = link.icon;

  return (
    <NavLink
      to={link.to}
      end={link.end}
      className={({ isActive }) => compact
        ? `flex min-h-11 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold transition-colors duration-base ease-standard ${
          isActive
            ? "border-primary bg-primary-subtle text-primary"
            : "border-transparent text-muted-foreground hover:border-border hover:bg-surface-subtle hover:text-text-strong"
        }`
        : `flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold transition-colors duration-base ease-standard ${
          isActive
            ? "bg-primary-subtle text-primary"
            : "text-muted-foreground hover:bg-surface-subtle hover:text-text-strong"
        }`
      }
    >
      <Icon className="size-4" aria-hidden="true" />
      <span>{link.label}</span>
    </NavLink>
  );
}

function UserSidebar() {
  const { user } = useAuthStore();

  return (
    <>
      <nav aria-label="Điều hướng tài khoản" className="grid w-full grid-cols-2 gap-2 rounded-lg border border-border bg-surface p-2 lg:hidden sm:grid-cols-4">
        {userLinks.map((link) => <UserNavigationLink key={link.to} link={link} compact />)}
      </nav>

      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="sticky top-24 border border-border bg-surface-elevated">
          <div className="border-b border-divider p-4">
            <div className="flex items-center gap-3">
              <UserAvatar user={user} className="size-10" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-text-strong">{user?.displayName || user?.username}</p>
                <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>
          </div>

          <nav aria-label="Điều hướng tài khoản" className="space-y-1 p-2">
            {userLinks.map((link) => <UserNavigationLink key={link.to} link={link} />)}
          </nav>
        </div>
      </aside>
    </>
  );
}

function AdminNavigationLink({ link, onNavigate }: { link: NavigationLink; onNavigate?: () => void }) {
  const Icon = link.icon;

  return (
    <NavLink
      to={link.to}
      end={link.end}
      onClick={onNavigate}
      className={({ isActive }) => `flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors duration-base ease-standard ${
        isActive
          ? "bg-primary text-primary-foreground shadow-elevation-1"
          : "text-muted-foreground hover:bg-surface-subtle hover:text-text-strong"
      }`}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 truncate">{link.label}</span>
    </NavLink>
  );
}

function AdminNavigation({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Điều hướng quản trị" className="space-y-1">
      {adminLinks.map((link) => <AdminNavigationLink key={link.to} link={link} onNavigate={onNavigate} />)}
    </nav>
  );
}

function AdminSidebar({ mobileOpen = false, onMobileOpenChange }: Pick<SidebarProps, "mobileOpen" | "onMobileOpenChange">) {
  const { user } = useAuthStore();
  const closeMobileNavigation = () => onMobileOpenChange?.(false);

  const accountSummary = (
    <div className="flex items-center gap-3">
      <UserAvatar user={user} className="size-10" />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-text-strong">{user?.displayName || user?.username}</p>
        <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="sticky top-24 rounded-lg border border-border bg-surface-elevated p-3">
          <div className="border-b border-divider px-2 pb-4">
            <p className="mb-3 text-xs font-semibold text-muted-foreground">QUẢN TRỊ PETMART</p>
            {accountSummary}
          </div>
          <div className="pt-3"><AdminNavigation /></div>
        </div>
      </aside>

      <Dialog
        open={mobileOpen}
        onOpenChange={(open) => onMobileOpenChange?.(open)}
        title="Điều hướng quản trị"
        description="Truy cập các khu vực quản lý của PetMart."
        size="sm"
        className="ml-auto h-[100dvh] max-h-none w-full max-w-sm rounded-none sm:rounded-l-lg"
      >
        <div className="mb-4 border-b border-divider pb-4">{accountSummary}</div>
        <AdminNavigation onNavigate={closeMobileNavigation} />
      </Dialog>
    </>
  );
}

function Sidebar({ mode = "user", mobileOpen, onMobileOpenChange }: SidebarProps) {
  return mode === "user"
    ? <UserSidebar />
    : <AdminSidebar mobileOpen={mobileOpen} onMobileOpenChange={onMobileOpenChange} />;
}

export default Sidebar;
