import { Link } from "react-router";
import {
  ArrowRight,
  HeartHandshake,
  Leaf,
  MessageCircleHeart,
  ShieldCheck,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";

const team = [
  {
    name: "Nguyễn Tiến An",
    role: "Founder & Lead Developer",
    initials: "NA",
    desc: "Người sáng lập PetMart, đam mê thú cưng và công nghệ từ thuở nhỏ.",
  },
  {
    name: "Hoàng Minh Nghĩa",
    role: "Co-Founder & Marketing",
    initials: "HN",
    desc: "Đồng sáng lập PetMart, đảm nhiệm truyền thông.",
  },
];

const milestones = [
  { year: "02/2026", title: "Thành lập", desc: "PetMart ra đời tại TP. Hà Nội." },
  { year: "04/2026", title: "1,000 khách hàng", desc: "Cột mốc đầu tiên — 1,000 gia đình đã tìm được người bạn đồng hành." },
  { year: "05/2026", title: "Mở rộng toàn quốc", desc: "Dịch vụ giao thú cưng phủ sóng 63 tỉnh thành trên cả nước." },
];

const values = [
  { icon: HeartHandshake, title: "Yêu thương", desc: "Mỗi thú cưng là một sinh linh sống — chúng xứng đáng được yêu thương như thành viên gia đình." },
  { icon: ShieldCheck, title: "Trách nhiệm", desc: "Cam kết minh bạch về nguồn gốc, sức khỏe và chất lượng của từng thú cưng." },
  { icon: Leaf, title: "Bền vững", desc: "Hợp tác với các trại nuôi đạo đức, không ủng hộ kinh doanh thú cưng phi pháp." },
  { icon: Users, title: "Cộng đồng", desc: "Xây dựng cộng đồng yêu thú cưng, chia sẻ kiến thức và hỗ trợ lẫn nhau." },
];

const AboutPage = () => {
  return (
    <div className="overflow-x-hidden">
      <div id="about-content">
        <section className="border-b border-border bg-surface-subtle">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-8 lg:py-24">
            <div>
              <p className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                <MessageCircleHeart aria-hidden="true" className="size-4" />
                Câu chuyện của chúng tôi
              </p>
              <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight text-text-strong text-balance sm:text-5xl lg:text-6xl">
                Kết nối người và thú cưng bằng sự rõ ràng và yêu thương.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                PetMart ra đời từ mong muốn giúp mỗi gia đình tìm được người bạn đồng hành phù hợp một cách an toàn, minh bạch và đầy yêu thương.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link to="/shop">Khám phá cửa hàng <ArrowRight aria-hidden="true" /></Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to="/">Về trang chủ</Link>
                </Button>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-primary p-7 text-primary-foreground sm:p-10">
              <HeartHandshake aria-hidden="true" className="relative size-10" />
              <p className="relative mt-8 max-w-sm text-2xl font-bold leading-tight">
                Một lựa chọn tốt bắt đầu từ thông tin đáng tin cậy.
              </p>
              <p className="relative mt-4 max-w-sm text-sm leading-6 text-primary-foreground/80">
                Vì vậy, chúng tôi đặt thông tin sản phẩm, sức khỏe và hành trình chăm sóc ở vị trí dễ tìm thấy.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20" aria-labelledby="mission-heading">
          <div className="grid gap-12 lg:grid-cols-[1fr_0.9fr] lg:items-start">
            <div>
              <p className="text-sm font-semibold text-primary">Sứ mệnh</p>
              <h2 id="mission-heading" className="mt-3 max-w-xl text-3xl font-black leading-tight text-text-strong sm:text-4xl">
                Giúp việc tìm một người bạn đồng hành trở nên an tâm hơn.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
                Chúng tôi làm việc trực tiếp với các trại nuôi được kiểm định, đảm bảo mỗi thú cưng đều có giấy tờ kiểm dịch đầy đủ, tiêm phòng và được chăm sóc sức khỏe tốt trước khi đến tay chủ mới.
              </p>
            </div>
            <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
              <li className="flex gap-4 p-5">
                <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
                <div><h3 className="font-bold text-text-strong">Thông tin minh bạch</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">Thông tin cần thiết được đặt cạnh quyết định mua, không ẩn sau các bước thừa.</p></div>
              </li>
              <li className="flex gap-4 p-5">
                <HeartHandshake aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
                <div><h3 className="font-bold text-text-strong">Chăm sóc có trách nhiệm</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">Sức khỏe và sự phù hợp lâu dài của thú cưng luôn là một phần của trải nghiệm.</p></div>
              </li>
              <li className="flex gap-4 p-5">
                <MessageCircleHeart aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
                <div><h3 className="font-bold text-text-strong">Cộng đồng được hỗ trợ</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">Người nuôi có nơi để tìm hiểu, đặt câu hỏi và chia sẻ kinh nghiệm.</p></div>
              </li>
            </ul>
          </div>
        </section>

        <section className="border-y border-border bg-surface-subtle py-16 lg:py-20" aria-labelledby="values-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <h2 id="values-heading" className="section-title">Giá trị cốt lõi</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Những điều chúng tôi dùng để định hướng sản phẩm và cách phục vụ mỗi ngày.</p>
            </div>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {values.map((value) => (
                <article key={value.title} className="rounded-xl border border-border bg-surface p-6">
                  <value.icon aria-hidden="true" className="size-6 text-primary" />
                  <h3 className="mt-5 font-bold text-text-strong">{value.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{value.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20" aria-labelledby="milestones-heading">
          <div className="text-center">
            <h2 id="milestones-heading" className="section-title">Hành trình phát triển</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Các mốc đang được ghi nhận trong hành trình PetMart.</p>
          </div>
          <ol className="relative mt-10 space-y-8 border-l border-border pl-8 sm:pl-10">
            {milestones.map((milestone) => (
              <li key={milestone.year} className="relative">
                <span className="absolute -left-[2.15rem] top-1 flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground ring-4 ring-background sm:-left-[2.65rem]" aria-hidden="true" />
                <p className="text-sm font-semibold text-primary">{milestone.year}</p>
                <h3 className="mt-1 text-lg font-bold text-text-strong">{milestone.title}</h3>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{milestone.desc}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-y border-border bg-surface-subtle py-16 lg:py-20" aria-labelledby="team-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <h2 id="team-heading" className="section-title">Đội ngũ của chúng tôi</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Những con người đứng sau sản phẩm và trải nghiệm PetMart.</p>
            </div>
            <div className="mt-10 grid gap-5 sm:grid-cols-2">
              {team.map((member) => (
                <article key={member.name} className="flex gap-5 rounded-xl border border-border bg-surface p-6">
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-sm font-bold text-primary" aria-hidden="true">{member.initials}</div>
                  <div>
                    <h3 className="font-bold text-text-strong">{member.name}</h3>
                    <p className="mt-1 text-sm font-semibold text-primary">{member.role}</p>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{member.desc}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="rounded-2xl bg-primary p-8 text-center text-primary-foreground sm:p-12">
            <h2 className="text-3xl font-black leading-tight sm:text-4xl">Sẵn sàng tìm người bạn đồng hành?</h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-primary-foreground/80">Khám phá các sản phẩm và lựa chọn đang có trên PetMart.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="bg-background text-text-strong hover:bg-background/90">
                <Link to="/shop">Khám phá cửa hàng <ArrowRight aria-hidden="true" /></Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
                <Link to="/">Về trang chủ</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AboutPage;
