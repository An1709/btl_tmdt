import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  ArrowRight,
  BadgeCheck,
  Headphones,
  HeartHandshake,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Truck,
} from "lucide-react";

import { petCategories } from "@/types/product";
import type { Product } from "@/types/product";
import { productService } from "@/services/productService";
import { categoryService } from "@/services/categoryService";
import ProductList from "@/components/features/product/ProductList";
import { useAuthStore } from "@/stores/useAuthStore";
import { ProductCardSkeleton } from "@/components/common/Loading";
import { EmptyState, ErrorState } from "@/components/ui/feedback-state";
import { Button } from "@/components/ui/button";

const ProductRowSkeleton = () => (
  <div
    className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
    aria-label="Đang tải sản phẩm"
    role="status"
  >
    {Array.from({ length: 6 }).map((_, index) => (
      <ProductCardSkeleton key={index} />
    ))}
  </div>
);

const HomePage = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin" || user?.role === "staff";
  const [activeCategory, setActiveCategory] = useState("all");

  const [personalizedProducts, setPersonalizedProducts] = useState<Product[]>([]);
  const [categoryProducts, setCategoryProducts] = useState<Product[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [accessories, setAccessories] = useState<Product[]>([]);
  const [personalizedLoading, setPersonalizedLoading] = useState(true);
  const [personalizedError, setPersonalizedError] = useState("");
  const [categoryLoading, setCategoryLoading] = useState(true);
  const [categoryError, setCategoryError] = useState("");
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [featuredError, setFeaturedError] = useState("");
  const [accLoading, setAccLoading] = useState(true);
  const selectedCategory = petCategories.find((cat) => cat.id === activeCategory) ?? petCategories[0];
  const categoryViewAllLink = activeCategory === "all" ? "/shop" : `/shop?cat=${activeCategory}`;

  useEffect(() => {
    productService.getPersonalizedRecommendations(8)
      .then((products) => setPersonalizedProducts(products.slice(0, 8)))
      .catch(() => {
        setPersonalizedProducts([]);
        setPersonalizedError("Không thể tải gợi ý dành cho bạn.");
      })
      .finally(() => setPersonalizedLoading(false));

    productService.getFeatured(8)
      .then((products) => setFeaturedProducts(products.slice(0, 8)))
      .catch(() => {
        setFeaturedProducts([]);
        setFeaturedError("Không thể tải sản phẩm nổi bật.");
      })
      .finally(() => setFeaturedLoading(false));

    productService.getAll({ category: "accessory", sort: "popular", limit: 6 })
      .then((res) => setAccessories(res.data))
      .catch(() => setAccessories([]))
      .finally(() => setAccLoading(false));
  }, []);

  useEffect(() => {
    let ignore = false;

    const loadCategoryProducts = async () => {
      setCategoryLoading(true);
      setCategoryError("");

      try {
        if (activeCategory !== "all") {
          const categoryId = await categoryService.resolveId(activeCategory);
          if (!categoryId) {
            if (!ignore) setCategoryProducts([]);
            return;
          }
        }

        const response = await productService.getAll({
          category: activeCategory === "all" ? undefined : activeCategory,
          sort: "popular",
          limit: 8,
        });

        if (!ignore) setCategoryProducts(response.data);
      } catch {
        if (!ignore) {
          setCategoryProducts([]);
          setCategoryError("Không thể tải sản phẩm theo loài.");
        }
      } finally {
        if (!ignore) setCategoryLoading(false);
      }
    };

    loadCategoryProducts();
    return () => {
      ignore = true;
    };
  }, [activeCategory]);

  const benefits = [
    { icon: ShieldCheck, title: "Thông tin rõ ràng", desc: "Dễ dàng xem giá, tồn kho và thông tin sản phẩm trước khi quyết định." },
    { icon: Truck, title: "Giao hàng tận nơi", desc: "Theo dõi lựa chọn giao hàng phù hợp với nhu cầu của bạn và thú cưng." },
    { icon: Headphones, title: "Hỗ trợ tận tâm", desc: "Đội ngũ PetMart sẵn sàng giải đáp trong suốt hành trình mua sắm." },
    { icon: HeartHandshake, title: "Chăm sóc có trách nhiệm", desc: "Đặt sự an toàn và mối quan hệ lâu dài giữa người với thú cưng lên trước." },
  ];

  return (
    <div className="overflow-x-hidden">
      <section className="relative isolate overflow-hidden bg-slate-950 text-white">
        <img
          src="https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=1600&h=900&fit=crop"
          alt="Chó và mèo đang ở bên nhau"
          className="absolute inset-0 -z-20 h-full w-full object-cover opacity-55"
        />
        <div className="absolute inset-0 -z-10 bg-slate-950/70" />
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="max-w-2xl">
            <p className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-white/80">
              <Sparkles aria-hidden="true" className="size-4 text-primary" />
              PetMart — mua sắm an tâm cho thú cưng
            </p>
            <h1 className="max-w-xl text-4xl font-black leading-tight tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Tìm đúng sản phẩm cho người bạn bốn chân.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-white/80 sm:text-lg">
              Khám phá thú cưng, thức ăn và phụ kiện được sắp xếp để bạn dễ tìm, dễ so sánh và dễ đưa ra lựa chọn phù hợp.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/shop">
                  Khám phá sản phẩm <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                <Link to="/about">Tìm hiểu về PetMart</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div id="home-content">
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="section-title">Bắt đầu theo nhu cầu</h2>
              <p className="mt-1 text-sm text-muted-foreground">Chọn nhóm phù hợp để đi thẳng đến sản phẩm bạn đang tìm.</p>
            </div>
            <Link to="/shop" className="inline-flex items-center gap-1 text-sm font-semibold text-primary underline-offset-4 hover:underline">
              Xem toàn bộ cửa hàng <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
          <div className="mt-6 flex gap-3 overflow-x-auto pb-2 scrollbar-hide" role="tablist" aria-label="Lọc sản phẩm theo loài">
            {petCategories.map((category) => (
              <button
                key={category.id}
                id={`category-${category.id}`}
                type="button"
                role="tab"
                aria-selected={activeCategory === category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${activeCategory === category.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-surface text-text-strong hover:border-primary hover:bg-primary-subtle"
                  }`}
              >
                <span aria-hidden="true" className="text-lg">{category.emoji}</span>
                {category.label}
              </button>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8" aria-live="polite">
          {categoryLoading && <ProductRowSkeleton />}
          {!categoryLoading && categoryError && (
            <ErrorState title="Chưa thể tải sản phẩm theo loài" description={categoryError} action={<Button asChild variant="outline"><Link to={categoryViewAllLink}>Mở cửa hàng</Link></Button>} />
          )}
          {!categoryLoading && !categoryError && categoryProducts.length === 0 && (
            <EmptyState title="Chưa có sản phẩm phù hợp" description="Hãy thử nhóm khác hoặc xem toàn bộ cửa hàng." action={<Button asChild variant="outline"><Link to="/shop">Xem cửa hàng</Link></Button>} />
          )}
          {!categoryLoading && !categoryError && categoryProducts.length > 0 && (
            <ProductList
              products={categoryProducts}
              title={activeCategory === "all" ? "Sản phẩm phổ biến" : selectedCategory.label}
              subtitle="Sản phẩm được chọn theo nhóm bạn đang quan tâm"
              viewAllLink={categoryViewAllLink}
            />
          )}
        </section>

        <section className="border-y border-border bg-surface-subtle" aria-live="polite">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            {personalizedLoading && <ProductRowSkeleton />}
            {!personalizedLoading && personalizedError && (
              <ErrorState title="Gợi ý hiện chưa sẵn sàng" description={personalizedError} action={<Button asChild variant="outline"><Link to="/shop">Khám phá cửa hàng</Link></Button>} />
            )}
            {!personalizedLoading && !personalizedError && personalizedProducts.length === 0 && (
              <EmptyState title="Chưa có gợi ý dành cho bạn" description="Bạn vẫn có thể bắt đầu bằng cách xem các sản phẩm phổ biến." action={<Button asChild variant="outline"><Link to="/shop">Xem sản phẩm</Link></Button>} />
            )}
            {!personalizedLoading && !personalizedError && personalizedProducts.length > 0 && (
              <ProductList
                products={personalizedProducts}
                title="Gợi ý dành cho bạn"
                subtitle="Tham khảo lựa chọn dựa trên hoạt động mua sắm hiện có của bạn"
                viewAllLink="/shop"
              />
            )}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8" aria-live="polite">
          {featuredLoading && <ProductRowSkeleton />}
          {!featuredLoading && featuredError && (
            <ErrorState title="Chưa thể tải sản phẩm nổi bật" description={featuredError} action={<Button asChild variant="outline"><Link to="/shop">Mở cửa hàng</Link></Button>} />
          )}
          {!featuredLoading && !featuredError && featuredProducts.length === 0 && (
            <EmptyState title="Chưa có sản phẩm nổi bật" description="Hãy xem toàn bộ danh mục để tìm lựa chọn phù hợp." action={<Button asChild variant="outline"><Link to="/shop">Xem cửa hàng</Link></Button>} />
          )}
          {!featuredLoading && !featuredError && featuredProducts.length > 0 && (
            <ProductList
              products={featuredProducts}
              title="Được quan tâm nhiều"
              subtitle="Những lựa chọn nổi bật đang được khách hàng chú ý"
              viewAllLink="/shop"
            />
          )}
        </section>

        <section className="bg-surface-subtle py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <h2 className="section-title">Một trải nghiệm mua sắm rõ ràng</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Các cam kết quen thuộc của PetMart được đặt cạnh hành trình mua sắm để bạn luôn biết điều gì đang chờ phía trước.</p>
            </div>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {benefits.map((benefit) => (
                <div key={benefit.title} className="border-t border-border pt-4">
                  <benefit.icon aria-hidden="true" className="size-5 text-primary" />
                  <h3 className="mt-3 text-sm font-bold text-text-strong">{benefit.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{benefit.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8" aria-live="polite">
          {accLoading && <ProductRowSkeleton />}
          {!accLoading && accessories.length === 0 && (
            <EmptyState title="Chưa có phụ kiện để hiển thị" description="Bạn có thể khám phá các danh mục khác trong cửa hàng." action={<Button asChild variant="outline"><Link to="/shop">Xem cửa hàng</Link></Button>} />
          )}
          {!accLoading && accessories.length > 0 && (
            <ProductList
              products={accessories}
              title="Phụ kiện cho cuộc sống hằng ngày"
              subtitle="Những món đồ nhỏ giúp việc chăm sóc thú cưng thuận tiện hơn"
              viewAllLink="/shop?cat=accessory"
            />
          )}
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 rounded-2xl border border-primary/25 bg-primary-subtle p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div>
              <p className="text-sm font-semibold text-primary">Ưu đãi hiện có</p>
              <h2 className="mt-2 text-2xl font-black text-text-strong">Giảm 20% cho đơn hàng đầu tiên</h2>
              <p className="mt-2 text-sm text-muted-foreground">Nhập mã <strong className="text-text-strong">PETMART20</strong> khi thanh toán.</p>
            </div>
            <Button asChild size="lg">
              <Link to="/shop">Mua sắm ngay <ArrowRight aria-hidden="true" /></Link>
            </Button>
          </div>
        </section>

        {isAdmin && (
          <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-primary-subtle p-3 text-primary"><BadgeCheck aria-hidden="true" className="size-5" /></div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Khu vực quản trị</p>
                  <h2 className="mt-1 text-xl font-bold text-text-strong">Quản lý PetMart</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Đang đăng nhập với tài khoản <span className="font-semibold text-text-strong">{user?.username}</span>.</p>
                </div>
              </div>
              <Button asChild variant="outline">
                <Link to="/admin"><ShoppingBag aria-hidden="true" /> Vào trang quản trị</Link>
              </Button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default HomePage;
