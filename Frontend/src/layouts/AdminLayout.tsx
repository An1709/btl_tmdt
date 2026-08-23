import { useState } from "react";
import { LayoutDashboard, Menu, Store } from "lucide-react";
import { Link, Outlet } from "react-router";

import Header from "@/components/common/Header";
import Sidebar from "@/components/common/Sidebar";
import { Button } from "@/components/ui/button";

const AdminLayout = () => {
  const [navigationOpen, setNavigationOpen] = useState(false);

  return (
    <div className="min-h-screen bg-canvas">
      <Header />
      <div className="mx-auto w-full max-w-[var(--content-max)] px-page py-5 sm:py-6">
        <div className="mb-5 flex min-h-14 flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface-elevated px-3 py-2 sm:px-4">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="lg:hidden"
              aria-label="Mở điều hướng quản trị"
              aria-expanded={navigationOpen}
              onClick={() => setNavigationOpen(true)}
            >
              <Menu aria-hidden="true" />
            </Button>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary-subtle text-primary" aria-hidden="true">
              <LayoutDashboard className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-text-strong">Không gian quản trị</p>
              <p className="hidden text-xs text-muted-foreground sm:block">Quản lý vận hành và dữ liệu PetMart</p>
            </div>
          </div>
          <Button asChild type="button" variant="outline" size="sm">
            <Link to="/shop"><Store aria-hidden="true" />Xem cửa hàng</Link>
          </Button>
        </div>

        <div className="flex items-start gap-6 lg:gap-8">
          <Sidebar mode="admin" mobileOpen={navigationOpen} onMobileOpenChange={setNavigationOpen} />
          <main id="main-content" className="min-w-0 flex-1 pb-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
