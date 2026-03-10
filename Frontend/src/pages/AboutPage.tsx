import { Link } from "react-router";

const team = [
    {
        name: "Nguyễn Minh Khoa",
        role: "Founder & CEO",
        emoji: "🧑‍💼",
        desc: "Người sáng lập PetMart, đam mê thú cưng và công nghệ từ thuở nhỏ.",
    },
    {
        name: "Trần Thị Lan",
        role: "Head of Care",
        emoji: "👩‍⚕️",
        desc: "Bác sĩ thú y với hơn 8 năm kinh nghiệm, đảm bảo mọi thú cưng đều khỏe mạnh.",
    },
    {
        name: "Lê Văn Hùng",
        role: "Lead Developer",
        emoji: "🧑‍💻",
        desc: "Kiến trúc sư hệ thống, xây dựng nền tảng PetMart từ con số 0.",
    },
    {
        name: "Phạm Thu Hà",
        role: "Customer Success",
        emoji: "👩‍🎤",
        desc: "Luôn lắng nghe và hỗ trợ khách hàng với nụ cười tươi 24/7.",
    },
];

const milestones = [
    { year: "2019", title: "Thành lập", desc: "PetMart ra đời tại TP. Hồ Chí Minh với 5 thành viên sáng lập." },
    { year: "2020", title: "1,000 khách hàng", desc: "Cột mốc đầu tiên — 1,000 gia đình đã tìm được người bạn đồng hành." },
    { year: "2022", title: "Mở rộng toàn quốc", desc: "Dịch vụ giao thú cưng phủ sóng 63 tỉnh thành trên cả nước." },
    { year: "2024", title: "10,000+ khách hàng", desc: "Trở thành pet shop online #1 Việt Nam, được xếp hạng 5 sao liên tiếp." },
];

const values = [
    { emoji: "❤️", title: "Yêu Thương", desc: "Mỗi thú cưng là một sinh linh sống – chúng deserves được yêu thương như thành viên gia đình." },
    { emoji: "🛡️", title: "Trách Nhiệm", desc: "Cam kết minh bạch về nguồn gốc, sức khỏe và chất lượng của từng thú cưng." },
    { emoji: "🌱", title: "Bền Vững", desc: "Hợp tác với các trại nuôi đạo đức, không ủng hộ kinh doanh thú cưng phi pháp." },
    { emoji: "🤝", title: "Cộng Đồng", desc: "Xây dựng cộng đồng yêu thú cưng, chia sẻ kiến thức và hỗ trợ lẫn nhau." },
];

const AboutPage = () => {
    return (
        <div className="overflow-x-hidden">

            {/* ── HERO ── */}
            <section className="relative min-h-[55vh] flex items-center overflow-hidden bg-gradient-to-br from-[var(--pet-coral)]/90 via-[var(--pet-mint)]/70 to-[var(--pet-warm)]/80">
                {/* Background pattern */}
                <div
                    className="absolute inset-0 opacity-[0.06]"
                    style={{
                        backgroundImage:
                            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
                    }}
                />
                {/* Floating emojis */}
                <div className="absolute top-10 right-16 text-6xl animate-float opacity-80 select-none hidden md:block">🐾</div>
                <div className="absolute bottom-10 right-1/3 text-5xl animate-float-slow opacity-60 select-none hidden lg:block">🐕</div>
                <div className="absolute top-1/3 left-10 text-4xl animate-float opacity-50 select-none hidden md:block">🐈</div>

                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center w-full">
                    <div className="inline-flex items-center gap-2 bg-white/25 backdrop-blur-sm border border-white/40 text-white text-sm font-semibold px-4 py-2 rounded-full mb-6">
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        Câu chuyện của chúng tôi
                    </div>
                    <h1
                        className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight mb-5"
                        style={{ fontFamily: "'Nunito', sans-serif" }}
                    >
                        Về <span className="text-white/80 underline decoration-wavy decoration-white/50">PetMart</span> 🐾
                    </h1>
                    <p className="text-lg text-white/85 max-w-2xl mx-auto leading-relaxed">
                        Chúng tôi tin rằng mỗi gia đình đều xứng đáng có một người bạn đồng hành bốn chân.
                        PetMart ra đời từ tình yêu thương dành cho động vật và mong muốn kết nối trái tim con người.
                    </p>
                </div>

                {/* Bottom curve */}
                <div className="absolute bottom-0 left-0 right-0">
                    <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M0 60L1440 60L1440 20C1200 60 240 -10 0 20L0 60Z" className="fill-background" />
                    </svg>
                </div>
            </section>

            {/* ── MISSION ── */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="grid md:grid-cols-2 gap-12 items-center">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--pet-coral)] mb-3">Sứ mệnh</p>
                        <h2 className="text-3xl md:text-4xl font-black text-foreground mb-5" style={{ fontFamily: "'Nunito', sans-serif" }}>
                            Kết nối trái tim — <br />
                            <span className="gradient-text">người và thú cưng</span>
                        </h2>
                        <p className="text-muted-foreground leading-relaxed mb-4">
                            PetMart được thành lập năm 2019 với một sứ mệnh đơn giản: giúp mọi gia đình tìm được người
                            bạn đồng hành phù hợp một cách an toàn, minh bạch và đầy yêu thương.
                        </p>
                        <p className="text-muted-foreground leading-relaxed">
                            Chúng tôi làm việc trực tiếp với các trại nuôi được kiểm định, đảm bảo mỗi thú cưng đều
                            có giấy tờ kiểm dịch đầy đủ, tiêm phòng và chăm sóc sức khỏe tốt trước khi đến tay chủ mới.
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { value: "10,000+", label: "Gia đình hạnh phúc", emoji: "🏠" },
                            { value: "500+", label: "Giống thú cưng", emoji: "🐾" },
                            { value: "5 năm", label: "Kinh nghiệm", emoji: "⭐" },
                            { value: "63", label: "Tỉnh thành phủ sóng", emoji: "🗺️" },
                        ].map((s) => (
                            <div key={s.label} className="bg-muted/50 dark:bg-muted/20 border border-border rounded-2xl p-5 text-center hover:shadow-md transition-shadow">
                                <div className="text-3xl mb-2">{s.emoji}</div>
                                <div className="text-2xl font-black text-foreground" style={{ fontFamily: "'Nunito', sans-serif" }}>{s.value}</div>
                                <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── VALUES ── */}
            <section className="bg-muted/40 dark:bg-muted/20 py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-10">
                        <h2 className="section-title">Giá Trị Cốt Lõi</h2>
                        <p className="text-sm text-muted-foreground mt-1">Những điều chúng tôi tin tưởng và sống theo mỗi ngày</p>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        {values.map((v) => (
                            <div key={v.title} className="bg-background border border-border rounded-2xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                                <div className="text-4xl mb-3">{v.emoji}</div>
                                <h3 className="font-bold text-foreground mb-2" style={{ fontFamily: "'Nunito', sans-serif" }}>{v.title}</h3>
                                <p className="text-xs text-muted-foreground leading-relaxed">{v.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── TIMELINE ── */}
            <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="text-center mb-10">
                    <h2 className="section-title">Hành Trình Phát Triển</h2>
                    <p className="text-sm text-muted-foreground mt-1">Từ một ý tưởng nhỏ đến pet shop #1 Việt Nam</p>
                </div>
                <div className="relative">
                    {/* Vertical line */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border -translate-x-1/2 hidden md:block" />
                    <div className="flex flex-col gap-8">
                        {milestones.map((m, i) => (
                            <div key={m.year} className={`flex items-center gap-6 ${i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"}`}>
                                <div className={`flex-1 ${i % 2 === 0 ? "md:text-right" : "md:text-left"}`}>
                                    <div className="bg-background border border-border rounded-2xl p-5 hover:shadow-md transition-shadow inline-block w-full">
                                        <p className="text-xs font-bold text-[var(--pet-coral)] uppercase tracking-widest mb-1">{m.year}</p>
                                        <h3 className="font-black text-foreground text-lg" style={{ fontFamily: "'Nunito', sans-serif" }}>{m.title}</h3>
                                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{m.desc}</p>
                                    </div>
                                </div>
                                {/* Dot */}
                                <div className="shrink-0 w-10 h-10 rounded-full bg-[var(--pet-coral)] flex items-center justify-center text-white font-black text-sm z-10 shadow-md hidden md:flex">
                                    {i + 1}
                                </div>
                                <div className="flex-1 hidden md:block" />
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── TEAM ── */}
            <section className="bg-muted/40 dark:bg-muted/20 py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-10">
                        <h2 className="section-title">Đội Ngũ Của Chúng Tôi</h2>
                        <p className="text-sm text-muted-foreground mt-1">Những con người đứng sau PetMart</p>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {team.map((t) => (
                            <div key={t.name} className="bg-background border border-border rounded-2xl p-6 text-center hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                                <div className="text-5xl mb-3">{t.emoji}</div>
                                <h3 className="font-bold text-foreground" style={{ fontFamily: "'Nunito', sans-serif" }}>{t.name}</h3>
                                <p className="text-xs font-semibold text-[var(--pet-coral)] mb-2">{t.role}</p>
                                <p className="text-xs text-muted-foreground leading-relaxed">{t.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA ── */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="rounded-3xl bg-gradient-to-r from-[var(--pet-coral)] to-[var(--pet-mint)] p-10 md:p-14 text-center relative overflow-hidden">
                    <div className="absolute top-4 right-8 text-5xl opacity-20 select-none">🐾</div>
                    <div className="absolute bottom-4 left-8 text-4xl opacity-15 select-none">🐕</div>
                    <h2 className="text-3xl md:text-4xl font-black text-white mb-4" style={{ fontFamily: "'Nunito', sans-serif" }}>
                        Sẵn sàng tìm người bạn đồng hành? 🐾
                    </h2>
                    <p className="text-white/80 mb-8 max-w-xl mx-auto">
                        Hàng trăm thú cưng đáng yêu đang chờ được yêu thương. Tìm ngay người bạn bốn chân của bạn!
                    </p>
                    <div className="flex flex-wrap justify-center gap-4">
                        <Link
                            to="/shop"
                            className="bg-white text-[var(--pet-coral)] font-bold px-8 py-3.5 rounded-2xl hover:bg-[var(--pet-warm)] hover:text-foreground hover:-translate-y-1 transition-all duration-300 shadow-xl"
                        >
                            🔍 Khám Phá Ngay
                        </Link>
                        <Link
                            to="/"
                            className="border-2 border-white/60 text-white font-bold px-8 py-3.5 rounded-2xl hover:bg-white/20 hover:-translate-y-1 transition-all duration-300"
                        >
                            🏠 Về Trang Chủ
                        </Link>
                    </div>
                </div>
            </section>

        </div>
    );
};

export default AboutPage;
