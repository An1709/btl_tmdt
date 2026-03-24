import { useState, useEffect } from "react";
import { Link } from "react-router";
import { petCategories } from "@/types/product";
import type { Product } from "@/types/product";
import { productService } from "@/services/productService";
import ProductList from "@/components/features/product/ProductList";
import { useAuthStore } from "@/stores/useAuthStore";

// ── Inline skeleton row for ProductList sections ──────────────────────────
const ProductRowSkeleton = () => (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 animate-pulse">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="rounded-2xl border border-border overflow-hidden bg-white dark:bg-card">
        <div className="bg-muted aspect-square w-full" />
        <div className="p-3 flex flex-col gap-2">
          <div className="h-3 bg-muted rounded w-3/4" />
          <div className="h-4 bg-muted rounded w-1/3" />
        </div>
      </div>
    ))}
  </div>
);

const HomePage = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin" || user?.role === "staff";
  const [activeCategory, setActiveCategory] = useState("all");
  const [email, setEmail] = useState("");

  const [pets, setPets] = useState<Product[]>([]);
  const [accessories, setAccessories] = useState<Product[]>([]);
  const [petsLoading, setPetsLoading] = useState(true);
  const [accLoading, setAccLoading] = useState(true);

  // Fetch featured pets and accessories concurrently on mount
  useEffect(() => {
    productService.getAll({ sort: "popular", limit: 6 })
      .then((res) => setPets(res.data.filter((p) => p.category !== "accessory")))
      .catch(() => {/* silently fail — home page shows empty sections on error */ })
      .finally(() => setPetsLoading(false));

    productService.getAll({ category: "accessory", sort: "popular", limit: 6 })
      .then((res) => setAccessories(res.data))
      .catch(() => { })
      .finally(() => setAccLoading(false));
  }, []);

  const features = [
    {
      emoji: "🐾", title: "Thú Cưng Khỏe Mạnh",
      desc: "100% thú cưng có giấy tờ kiểm dịch, tiêm phòng đầy đủ, cam kết sức khỏe.",
      gradient: "from-red-50 to-pink-50 dark:from-red-950/30 dark:to-pink-950/30",
      border: "border-red-100 dark:border-red-900/30",
    },
    {
      emoji: "🚚", title: "Giao Hàng Tận Nơi",
      desc: "Dịch vụ vận chuyển thú cưng an toàn, nhanh chóng trong vòng 24–48h.",
      gradient: "from-teal-50 to-cyan-50 dark:from-teal-950/30 dark:to-cyan-950/30",
      border: "border-teal-100 dark:border-teal-900/30",
    },
    {
      emoji: "💝", title: "Hỗ Trợ Tận Tâm",
      desc: "Đội ngũ chuyên gia thú cưng tư vấn 24/7, bảo hành sức khỏe 30 ngày.",
      gradient: "from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30",
      border: "border-amber-100 dark:border-amber-900/30",
    },
    {
      emoji: "⭐", title: "Đánh Giá 5 Sao",
      desc: "Hơn 10,000+ khách hàng hài lòng, xếp hạng #1 pet shop online Việt Nam.",
      gradient: "from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/30",
      border: "border-purple-100 dark:border-purple-900/30",
    },
  ];

  const stats = [
    { value: "10,000+", label: "Khách hàng vui lòng" },
    { value: "500+", label: "Giống thú cưng" },
    { value: "30", label: "Ngày bảo hành" },
    { value: "24/7", label: "Hỗ trợ trực tuyến" },
  ];

  return (
    <div className="overflow-x-hidden">

      {/* ============================================================ */}
      {/*  1. HERO BANNER                                               */}
      {/* ============================================================ */}
      <section className="relative min-h-[88vh] flex items-center overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=1600&h=900&fit=crop"
          alt="Hero pets"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="hero-overlay absolute inset-0" />

        <div className="absolute top-16 right-12 text-6xl animate-float opacity-90 select-none hidden md:block">🐕</div>
        <div className="absolute bottom-24 right-24 text-5xl animate-float-slow opacity-80 select-none hidden md:block">🐈</div>
        <div className="absolute top-32 right-1/3 text-4xl animate-float opacity-70 select-none hidden lg:block delay-200">🐇</div>
        <div className="absolute bottom-16 left-16 text-4xl animate-float-slow opacity-60 select-none hidden md:block delay-400">🐾</div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm border border-white/30
                                        text-white text-sm font-semibold px-4 py-2 rounded-full mb-6 animate-fade-in-up">
              <span className="w-2 h-2 bg-[var(--pet-warm)] rounded-full animate-pulse" />
              🐾 Cửa hàng thú cưng #1 Việt Nam
            </div>

            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight mb-4 animate-fade-in-up delay-100"
              style={{ fontFamily: "'Nunito', sans-serif" }}
            >
              Mang Người Bạn<br />
              <span className="text-[var(--pet-warm)]">Bốn Chân</span> Về Nhà
              <span className="ml-2">🐾</span>
            </h1>

            <p className="text-lg text-white/85 mb-8 leading-relaxed animate-fade-in-up delay-200">
              Khám phá hàng trăm giống thú cưng đáng yêu và phụ kiện cao cấp.
              Mỗi bé đều được chăm sóc tận tình, có giấy kiểm dịch đầy đủ.
            </p>

            <div className="flex flex-wrap gap-4 animate-fade-in-up delay-300">
              <Link
                to="/shop" id="hero-explore-btn"
                className="bg-white text-[var(--pet-coral)] font-bold px-8 py-3.5 rounded-2xl
                                           hover:bg-[var(--pet-warm)] hover:text-foreground hover:-translate-y-1
                                           transition-all duration-300 shadow-xl hover:shadow-2xl flex items-center gap-2 text-sm md:text-base"
              >
                🔍 Khám Phá Ngay
              </Link>
              <Link
                to="/shop?cat=dog" id="hero-pets-btn"
                className="border-2 border-white/60 text-white font-bold px-8 py-3.5 rounded-2xl
                                           hover:bg-white/20 backdrop-blur-sm hover:-translate-y-1
                                           transition-all duration-300 flex items-center gap-2 text-sm md:text-base"
              >
                🐕 Xem Thú Cưng
              </Link>
            </div>

            <div className="flex flex-wrap gap-6 mt-10 animate-fade-in-up delay-400">
              {stats.map((s) => (
                <div key={s.label} className="text-white">
                  <div className="text-2xl font-black" style={{ fontFamily: "'Nunito', sans-serif" }}>{s.value}</div>
                  <div className="text-xs text-white/70">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 60L1440 60L1440 20C1200 60 240 -10 0 20L0 60Z" className="fill-background" />
          </svg>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  2. CATEGORY STRIP                                            */}
      {/* ============================================================ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="text-center mb-6">
          <h2 className="section-title">Tìm Theo Loài</h2>
          <p className="text-sm text-muted-foreground mt-1">Chọn người bạn đồng hành lý tưởng của bạn</p>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide justify-start md:justify-center flex-nowrap">
          {petCategories.map((cat) => (
            <button
              key={cat.id}
              id={`category-${cat.id}`}
              onClick={() => setActiveCategory(cat.id)}
              className={`category-pill ${activeCategory === cat.id ? "active" : ""}`}
            >
              <span className="text-2xl">{cat.emoji}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ============================================================ */}
      {/*  3. FEATURED PETS                                             */}
      {/* ============================================================ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {petsLoading ? (
          <ProductRowSkeleton />
        ) : (
          <ProductList
            products={pets}
            title="Thú Cưng Nổi Bật ✨"
            subtitle="Những người bạn đồng hành đang chờ được yêu thương"
            viewAllLink="/shop?type=pets"
          />
        )}
      </section>

      {/* ============================================================ */}
      {/*  4. WHY PETMART FEATURES                                      */}
      {/* ============================================================ */}
      <section className="bg-muted/40 dark:bg-muted/20 py-16 mt-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="section-title">Tại Sao Chọn PetMart?</h2>
            <p className="text-sm text-muted-foreground mt-1">Cam kết mang lại trải nghiệm tốt nhất cho bạn và thú cưng</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((f, i) => (
              <div
                key={f.title}
                className={`feature-box bg-gradient-to-br ${f.gradient} border ${f.border} animate-fade-in-up`}
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="text-4xl">{f.emoji}</div>
                <h3 className="font-bold text-foreground text-sm" style={{ fontFamily: "'Nunito', sans-serif" }}>{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  5. ACCESSORIES SECTION                                       */}
      {/* ============================================================ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {accLoading ? (
          <ProductRowSkeleton />
        ) : (
          <ProductList
            products={accessories}
            title="Phụ Kiện Yêu Thương 🛍️"
            subtitle="Tất cả những gì bé cần cho một cuộc sống hạnh phúc"
            viewAllLink="/shop?cat=accessory"
          />
        )}
      </section>

      {/* ============================================================ */}
      {/*  6. BANNER PROMO STRIP                                        */}
      {/* ============================================================ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="rounded-3xl overflow-hidden relative bg-gradient-to-r from-[var(--pet-coral)] to-[var(--pet-mint)] p-8 md:p-12 flex flex-col md:flex-row items-center gap-6">
          <div className="absolute top-4 right-8 text-5xl opacity-20 select-none">🐾</div>
          <div className="absolute bottom-4 right-32 text-3xl opacity-15 select-none">🐕</div>
          <div className="flex-1 text-white text-center md:text-left">
            <p className="text-sm font-semibold uppercase tracking-widest text-white/70 mb-2">Ưu Đãi Đặc Biệt</p>
            <h2 className="text-3xl md:text-4xl font-black mb-3" style={{ fontFamily: "'Nunito', sans-serif" }}>
              Giảm 20% Đơn Hàng<br />Đầu Tiên! 🎉
            </h2>
            <p className="text-white/80 text-sm">Dùng mã <strong className="text-[var(--pet-warm)]">PETMART20</strong> khi thanh toán</p>
          </div>
          <Link
            to="/shop" id="promo-btn"
            className="bg-white text-[var(--pet-coral)] font-bold px-8 py-3.5 rounded-2xl
                                   hover:bg-[var(--pet-warm)] hover:text-foreground hover:-translate-y-1
                                   transition-all duration-300 shadow-lg text-sm shrink-0"
          >
            Mua Ngay →
          </Link>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  7. NEWSLETTER CTA                                            */}
      {/* ============================================================ */}
      <section className="bg-foreground dark:bg-card py-16">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <div className="text-4xl mb-4">📬</div>
          <h2 className="text-2xl md:text-3xl font-black text-white mb-3" style={{ fontFamily: "'Nunito', sans-serif" }}>
            Nhận Ưu Đãi Mỗi Tuần
          </h2>
          <p className="text-white/60 text-sm mb-6">
            Đăng ký nhận thông báo về các chương trình khuyến mãi và mẹo chăm sóc thú cưng.
          </p>
          <form className="flex gap-3 max-w-md mx-auto" onSubmit={(e) => { e.preventDefault(); setEmail(""); }}>
            <input
              type="email" id="newsletter-email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Nhập email của bạn..."
              className="flex-1 px-4 py-3 rounded-2xl bg-white/10 border border-white/20 text-white placeholder:text-white/40
                                       focus:outline-none focus:ring-2 focus:ring-[var(--pet-coral)]/50 focus:border-[var(--pet-coral)]
                                       text-sm transition-all"
            />
            <button type="submit" id="newsletter-submit" className="btn-pet-primary px-6 shrink-0">Đăng Ký</button>
          </form>
          <p className="text-xs text-white/30 mt-4">Không spam. Hủy đăng ký bất cứ lúc nào.</p>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  8. ADMIN QUICK-ACCESS                                        */}
      {/* ============================================================ */}
      {isAdmin && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/60 p-8 md:p-10 flex flex-col md:flex-row items-center gap-6 shadow-2xl">
            <div
              className="absolute inset-0 opacity-[0.04]"
              style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='32' height='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h32v1H0zM0 0v32h1V0z' fill='%23fff'/%3E%3C/svg%3E\")" }}
            />
            <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-violet-600/20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />
            <div className="relative flex flex-col md:flex-row items-center md:items-start gap-5 flex-1">
              <div className="text-5xl select-none">🛡️</div>
              <div className="text-center md:text-left">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">Khu vực quản trị</p>
                <h2 className="text-2xl md:text-3xl font-black bg-gradient-to-r from-violet-400 to-indigo-300 bg-clip-text text-transparent mb-2" style={{ fontFamily: "'Nunito', sans-serif" }}>
                  Trang Quản Trị Admin
                </h2>
                <p className="text-slate-400 text-sm">
                  Bạn đang đăng nhập với tài khoản&nbsp;
                  <span className="text-violet-300 font-semibold">{user?.username}</span>.
                  &nbsp;Quay lại bảng điều khiển để quản lý hệ thống.
                </p>
              </div>
            </div>
            <Link
              to="/admin" id="admin-dashboard-btn"
              className="relative shrink-0 inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600
                                       hover:from-violet-500 hover:to-indigo-500 text-white font-bold px-7 py-3.5 rounded-2xl
                                       transition-all duration-300 hover:-translate-y-1 shadow-lg hover:shadow-violet-500/30 text-sm"
            >
              ⚙️ Vào Trang Quản Trị
            </Link>
          </div>
        </section>
      )}

    </div>
  );
};

export default HomePage;
