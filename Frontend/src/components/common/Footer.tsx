import { useId, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { Mail, MapPin, PawPrint, Phone } from "lucide-react";

import { newsletterService } from "@/services/newsletterService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getNewsletterError = (error: unknown) =>
    (error as { response?: { data?: { message?: string } } }).response?.data?.message
    || "Không thể gửi ưu đãi. Vui lòng thử lại sau.";

const shopLinks = [
    { label: "Chó", to: "/shop?cat=dog" },
    { label: "Mèo", to: "/shop?cat=cat" },
    { label: "Thỏ", to: "/shop?cat=rabbit" },
    { label: "Hamster", to: "/shop?cat=hamster" },
    { label: "Phụ kiện", to: "/shop?cat=accessory" },
];

const supportLinks = [
    { label: "Cẩm nang thú cưng", to: "/blog" },
    { label: "Nhận diện giống thú cưng", to: "/pet-vision" },
    { label: "Theo dõi đơn hàng", to: "/orders" },
    { label: "Danh sách yêu thích", to: "/wishlist" },
    { label: "Yêu cầu bảo hành", to: "/warranty" },
];

const Footer = () => {
    const year = new Date().getFullYear();
    const statusId = useId();
    const [newsletterEmail, setNewsletterEmail] = useState("");
    const [newsletterMessage, setNewsletterMessage] = useState("");
    const [newsletterStatus, setNewsletterStatus] = useState<"success" | "error" | "">("");
    const [newsletterLoading, setNewsletterLoading] = useState(false);

    const validateNewsletterEmail = () => {
        const email = newsletterEmail.trim();

        if (!email) {
            setNewsletterStatus("error");
            setNewsletterMessage("Vui lòng nhập email để nhận ưu đãi.");
            return "";
        }

        if (!EMAIL_PATTERN.test(email)) {
            setNewsletterStatus("error");
            setNewsletterMessage("Email không hợp lệ.");
            return "";
        }

        return email;
    };

    const sendNewsletterCoupon = async () => {
        const email = validateNewsletterEmail();
        if (!email) return false;

        setNewsletterLoading(true);
        setNewsletterMessage("");
        setNewsletterStatus("");

        try {
            const response = await newsletterService.subscribe(email);
            setNewsletterStatus("success");
            setNewsletterMessage(response.message || "Ưu đãi dành cho người mới đã được gửi đến email của bạn.");
            return true;
        } catch (error) {
            setNewsletterStatus("error");
            setNewsletterMessage(getNewsletterError(error));
            return false;
        } finally {
            setNewsletterLoading(false);
        }
    };

    const handleNewsletterSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        await sendNewsletterCoupon();
    };

    return (
        <footer className="mt-16 border-t border-divider bg-text-strong text-text-inverse">
            <div className="mx-auto max-w-[var(--content-max)] px-page py-12 lg:py-14">
                <div className="grid gap-10 md:grid-cols-2 xl:grid-cols-[1.35fr_0.8fr_1fr_1.25fr]">
                    <section aria-labelledby="footer-brand-heading" className="max-w-sm">
                        <Link to="/" className="inline-flex min-h-11 items-center gap-2 rounded-md text-text-inverse focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-focus/45 focus-visible:ring-offset-2 focus-visible:ring-offset-text-strong">
                            <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground" aria-hidden="true">
                                <PawPrint className="size-5" />
                            </span>
                            <span id="footer-brand-heading" className="font-heading text-xl font-extrabold">PetMart</span>
                        </Link>
                        <p className="mt-4 text-sm leading-6 text-text-inverse/70">
                            Mang người bạn bốn chân về nhà với những sản phẩm và dịch vụ được chọn lọc cho thú cưng.
                        </p>
                        <address className="mt-5 space-y-3 not-italic text-sm text-text-inverse/70">
                            <a href="tel:1800-PETMART" className="flex min-h-11 items-center gap-2 rounded-sm hover:text-text-inverse focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-focus/45 focus-visible:ring-offset-2 focus-visible:ring-offset-text-strong">
                                <Phone className="size-4" aria-hidden="true" />1800-PETMART
                            </a>
                            <a href="mailto:hello@petmart.vn" className="flex min-h-11 items-center gap-2 rounded-sm hover:text-text-inverse focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-focus/45 focus-visible:ring-offset-2 focus-visible:ring-offset-text-strong">
                                <Mail className="size-4" aria-hidden="true" />hello@petmart.vn
                            </a>
                            <p className="flex items-center gap-2"><MapPin className="size-4" aria-hidden="true" />TP. Hà Nội, Việt Nam</p>
                        </address>
                    </section>

                    <section aria-labelledby="footer-shop-heading">
                        <h2 id="footer-shop-heading" className="text-base font-semibold text-text-inverse">Khám phá cửa hàng</h2>
                        <ul className="mt-4 space-y-2.5">
                            {shopLinks.map((link) => (
                                <li key={link.to}>
                                    <Link to={link.to} className="inline-flex min-h-11 items-center rounded-sm text-sm text-text-inverse/70 transition-colors duration-base hover:text-text-inverse focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-focus/45 focus-visible:ring-offset-2 focus-visible:ring-offset-text-strong">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </section>

                    <section aria-labelledby="footer-support-heading">
                        <h2 id="footer-support-heading" className="text-base font-semibold text-text-inverse">Hỗ trợ</h2>
                        <ul className="mt-4 space-y-2.5">
                            {supportLinks.map((link) => (
                                <li key={link.to}>
                                    <Link to={link.to} className="inline-flex min-h-11 items-center rounded-sm text-sm text-text-inverse/70 transition-colors duration-base hover:text-text-inverse focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-focus/45 focus-visible:ring-offset-2 focus-visible:ring-offset-text-strong">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </section>

                    <section aria-labelledby="footer-newsletter-heading">
                        <h2 id="footer-newsletter-heading" className="text-base font-semibold text-text-inverse">Nhận ưu đãi</h2>
                        <p className="mt-4 text-sm leading-6 text-text-inverse/70">Đăng ký email để nhận ưu đãi dành cho khách hàng mới.</p>
                        <form className="mt-4 flex flex-col gap-2 sm:flex-row xl:flex-col" onSubmit={handleNewsletterSubmit} noValidate>
                            <label className="sr-only" htmlFor="footer-newsletter-email">Email nhận ưu đãi</label>
                            <Input
                                id="footer-newsletter-email"
                                type="email"
                                autoComplete="email"
                                value={newsletterEmail}
                                onChange={(event) => {
                                    setNewsletterEmail(event.target.value);
                                    if (newsletterMessage) {
                                        setNewsletterMessage("");
                                        setNewsletterStatus("");
                                    }
                                }}
                                disabled={newsletterLoading}
                                aria-invalid={newsletterStatus === "error" ? true : undefined}
                                aria-describedby={newsletterMessage ? statusId : undefined}
                                placeholder="Email của bạn"
                                className="min-w-0 border-text-inverse/25 bg-text-inverse/10 text-text-inverse placeholder:text-text-inverse/60 focus-visible:border-primary focus-visible:ring-primary/40 focus-visible:ring-offset-text-strong"
                            />
                            <Button type="submit" loading={newsletterLoading} className="shrink-0 sm:w-auto xl:w-full">
                                Đăng ký
                            </Button>
                        </form>
                        {newsletterMessage && (
                            <p id={statusId} role={newsletterStatus === "error" ? "alert" : "status"} className={`mt-3 text-sm leading-6 ${newsletterStatus === "success" ? "text-success" : "text-destructive"}`}>
                                {newsletterMessage}
                            </p>
                        )}
                    </section>
                </div>

                <div className="mt-12 flex flex-col gap-4 border-t border-text-inverse/15 pt-6 text-sm text-text-inverse/60 sm:flex-row sm:items-center sm:justify-between">
                    <p>© {year} PetMart. Bảo lưu mọi quyền.</p>
                    <span aria-label="Phương thức thanh toán được hỗ trợ">Thanh toán khi nhận hàng · VNPay</span>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
