// seedPosts.mjs  — run with: node seedPosts.mjs
// Inserts 12 sample blog posts into MongoDB.
// Reads MONGODB_URL from .env via dotenv.
import 'dotenv/config';
import mongoose from 'mongoose';

// ── Post schema (inline, avoids ESM/CJS issues with the app) ──────────────
const postSchema = new mongoose.Schema(
    {
        title: { type: String, required: true },
        slug: { type: String, unique: true },
        content: { type: String, required: true },
        excerpt: { type: String },
        author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        type: { type: String, enum: ['blog', 'forum_topic'], default: 'blog' },
        thumbnail: { type: String },
        tags: [{ type: String }],
        views: { type: Number, default: 0 },
        likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    },
    { timestamps: true },
);
const Post = mongoose.models.Post || mongoose.model('Post', postSchema);

const User = mongoose.models.User ||
    mongoose.model('User', new mongoose.Schema({ username: String, role: String }, { strict: false }));

// ── helper ─────────────────────────────────────────────────────────────────
const slug = (s) =>
    s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim()
        .replace(/\s+/g, '-').replace(/-+/g, '-');

// ── post data ──────────────────────────────────────────────────────────────
const posts = [
    {
        title: 'Cách Chăm Sóc Chó Con Mới Về Nhà',
        slug: 'cach-cham-soc-cho-con-moi-ve-nha',
        tags: ['chó', 'chăm sóc', 'mẹo hay'],
        thumbnail: 'https://images.unsplash.com/photo-1534361960057-19f4434a4d81?w=800&h=450&fit=crop',
        excerpt: 'Những bước đầu tiên quan trọng giúp chó con thích nghi với môi trường mới một cách an toàn và hạnh phúc.',
        content: `<h2>Chuẩn bị trước khi đón bé về</h2>
<p>Trước khi đón chú chó con về nhà, bạn cần chuẩn bị đầy đủ: ổ ngủ ấm áp, bát ăn inox, thức ăn phù hợp theo độ tuổi, và khu vực vệ sinh riêng.</p>
<h2>Tuần đầu tiên</h2>
<p>Tuần đầu tiên là khoảng thời gian quan trọng nhất. Hãy để bé có không gian riêng, tránh ôm bồng quá nhiều để bé không bị stress. Cho ăn đúng giờ 3-4 lần/ngày với khẩu phần nhỏ.</p>
<h2>Lịch tiêm phòng</h2>
<p>Đưa bé đến bác sĩ thú y trong vòng 48h đầu để kiểm tra sức khỏe và lên lịch tiêm phòng. Vaccine quan trọng bao gồm: 5 bệnh, dại, và lepto.</p>
<h2>Xã hội hoá sớm</h2>
<p>Cho bé tiếp xúc với người, âm thanh và môi trường khác nhau từ sớm để hình thành tính cách thân thiện.</p>`,
    },
    {
        title: 'Top 5 Giống Mèo Phổ Biến Nhất Việt Nam',
        slug: 'top-5-giong-meo-pho-bien-nhat-viet-nam',
        tags: ['mèo', 'giống mèo', 'top 5'],
        thumbnail: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800&h=450&fit=crop',
        excerpt: 'Khám phá những giống mèo được yêu thích nhất tại Việt Nam và đặc điểm nổi bật của từng giống.',
        content: `<h2>1. Mèo Anh Lông Ngắn (British Shorthair)</h2>
<p>Giống mèo điềm tĩnh, thân thiện và dễ nuôi. Bộ lông dày, tròn trĩnh rất đáng yêu. Phù hợp với gia đình có trẻ nhỏ.</p>
<h2>2. Mèo Ba Tư (Persian)</h2>
<p>Nổi tiếng với bộ lông dài mượt và khuôn mặt dẹp. Cần chải lông hàng ngày nhưng tính cách rất hiền lành.</p>
<h2>3. Mèo Ragdoll</h2>
<p>Mèo "búp bê" với đặc điểm thả mình mềm khi được bế. Màu mắt xanh biếc đặc trưng và tính cách cực kỳ thuần.</p>
<h2>4. Mèo Scottish Fold</h2>
<p>Tai cụp độc đáo tạo nên vẻ ngoài dễ thương khác biệt. Thân thiện và vui vẻ với trẻ em.</p>
<h2>5. Mèo Tabby (Mèo vằn)</h2>
<p>Giống mèo dễ tìm, khỏe mạnh và ít tốn kém nhất. Tính cách linh hoạt, thích nghi tốt với mọi môi trường.</p>`,
    },
    {
        title: 'Thức Ăn Nào Tốt Nhất Cho Chó Cưng?',
        slug: 'thuc-an-nao-tot-nhat-cho-cho-cuong',
        tags: ['chó', 'dinh dưỡng', 'thức ăn'],
        thumbnail: 'https://images.unsplash.com/photo-1568640347023-a616a30bc3bd?w=800&h=450&fit=crop',
        excerpt: 'Hướng dẫn chọn thức ăn phù hợp cho chó theo từng độ tuổi và tình trạng sức khỏe.',
        content: `<h2>Thức ăn hạt khô (Dry Kibble)</h2>
<p>Loại thức ăn phổ biến nhất, tiện lợi và cân bằng dinh dưỡng. Các thương hiệu uy tín: Royal Canin, Orijen, Taste of the Wild.</p>
<h2>Thức ăn ướt (Wet Food)</h2>
<p>Hàm lượng nước cao giúp chó uống đủ nước. Thường được dùng kết hợp với thức ăn khô hoặc cho chó lớn tuổi, ốm yếu.</p>
<h2>Thức ăn tươi (Raw/Fresh)</h2>
<p>Chế độ ăn BARF (Biologically Appropriate Raw Food) ngày càng phổ biến. Bao gồm thịt sống, xương, rau củ — cần tham khảo bác sĩ thú y trước khi áp dụng.</p>
<h2>Thực phẩm cần tránh</h2>
<p>Tuyệt đối không cho chó ăn: socola, nho, tỏi, hành, xylitol, caffeine và rượu bia.</p>`,
    },
    {
        title: 'Lịch Tiêm Phòng Cho Mèo Từ A đến Z',
        slug: 'lich-tiem-phong-cho-meo-tu-a-den-z',
        tags: ['mèo', 'sức khỏe', 'tiêm phòng'],
        thumbnail: 'https://images.unsplash.com/photo-1596854372001-3b3bef5b7c37?w=800&h=450&fit=crop',
        excerpt: 'Tất cả những gì bạn cần biết về lịch tiêm chủng cho mèo con và mèo trưởng thành.',
        content: `<h2>Vaccine quan trọng cho mèo</h2>
<p>Có hai nhóm vaccine: core (bắt buộc) và non-core (tùy chọn theo lối sống của mèo).</p>
<h2>Vaccine core</h2>
<ul>
<li><strong>FVRCP:</strong> Phòng rhinotracheitis, calicivirus, panleukopenia. Tiêm lúc 8, 12, 16 tuần tuổi.</li>
<li><strong>Dại:</strong> Bắt buộc theo pháp luật, tiêm lúc 12–16 tuần.</li>
</ul>
<h2>Lịch nhắc lại</h2>
<p>FVRCP nhắc lại sau 1 năm, sau đó mỗi 3 năm. Vaccine dại nhắc lại hàng năm hoặc 3 năm tùy loại thuốc.</p>
<h2>Lưu ý sau tiêm</h2>
<p>Theo dõi mèo trong 24h sau tiêm. Có thể buồn ngủ nhẹ, giảm ăn — hoàn toàn bình thường. Nếu có dấu hiệu bất thường, liên hệ ngay bác sĩ thú y.</p>`,
    },
    {
        title: 'Huấn Luyện Chó Nghe Lời Cho Người Mới Bắt Đầu',
        slug: 'huan-luyen-cho-nghe-loi-cho-nguoi-moi-bat-dau',
        tags: ['chó', 'huấn luyện', 'hành vi'],
        thumbnail: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&h=450&fit=crop',
        excerpt: 'Các kỹ thuật huấn luyện chó cơ bản hiệu quả nhất với phương pháp tích cực, không trừng phạt.',
        content: `<h2>Nguyên tắc vàng: Củng cố tích cực</h2>
<p>Thưởng ngay lập tức khi chó làm đúng. Không dùng đòn roi hay la hét — sẽ gây stress và làm chó sợ hãi.</p>
<h2>Lệnh cơ bản cần dạy trước</h2>
<ul>
<li><strong>Ngồi (Sit):</strong> Nâng treat lên cao, chó tự ngồi xuống → thưởng ngay.</li>
<li><strong>Nằm (Down):</strong> Từ tư thế ngồi, kéo treat xuống đất → thưởng.</li>
<li><strong>Lại đây (Come):</strong> Quan trọng nhất về an toàn. Luyện hàng ngày.</li>
<li><strong>Ở đây (Stay):</strong> Bắt đầu với 3 giây, tăng dần thời gian.</li>
</ul>
<h2>Tần suất tập luyện</h2>
<p>10–15 phút mỗi buổi, 2–3 lần/ngày. Quá dài sẽ làm chó mất tập trung. Luôn kết thúc bài tập bằng thành công nhỏ.</p>`,
    },
    {
        title: 'Cá Cảnh Cho Người Mới: Nên Bắt Đầu Với Loài Nào?',
        slug: 'ca-canh-cho-nguoi-moi-nen-bat-dau-voi-loai-nao',
        tags: ['cá cảnh', 'thú cưng nhỏ', 'hướng dẫn'],
        thumbnail: 'https://images.unsplash.com/photo-1535591273668-578e31182c4f?w=800&h=450&fit=crop',
        excerpt: 'Chọn loại cá cảnh phù hợp cho người mới bắt đầu: dễ nuôi, giá hợp lý và không đòi hỏi thiết bị phức tạp.',
        content: `<h2>Tại sao nên bắt đầu với cá cảnh?</h2>
<p>Chi phí thấp, không gian linh hoạt, và hiệu quả giảm stress đã được khoa học chứng minh. Lý tưởng cho chung cư và nhà nhỏ.</p>
<h2>Top 5 loài cá cho người mới</h2>
<ul>
<li><strong>Cá Betta:</strong> Màu sắc rực rỡ, nuôi đơn lẻ trong bể nhỏ, không cần sục khí.</li>
<li><strong>Cá Tetra Neon:</strong> Bầy đàn đẹp mắt, bình hoà với hầu hết loài khác.</li>
<li><strong>Cá Guppy:</strong> Sinh sản dễ, đủ màu sắc, chịu đựng môi trường biến động tốt.</li>
<li><strong>Cá Molly:</strong> Hiền lành, dễ thích nghi với nhiều độ pH và nhiệt độ.</li>
<li><strong>Cá Corydoras:</strong> Dọn đáy bể tự nhiên, sống hoà bình với mọi loài.</li>
</ul>
<h2>Thiết bị tối thiểu</h2>
<p>Bể tối thiểu 20L, lọc nhỏ, đèn LED, nhiệt kế nước. Tổng chi phí ban đầu khoảng 300.000–500.000 VNĐ.</p>`,
    },
    {
        title: 'Dấu Hiệu Chó Bị Ốm Mà Chủ Không Nên Bỏ Qua',
        slug: 'dau-hieu-cho-bi-om-ma-chu-khong-nen-bo-qua',
        tags: ['chó', 'sức khỏe', 'cảnh báo'],
        thumbnail: 'https://images.unsplash.com/photo-1518155317743-a8ff43ea6a5f?w=800&h=450&fit=crop',
        excerpt: 'Nhận biết sớm 8 dấu hiệu bất thường ở chó để kịp thời đưa bé đến bác sĩ thú y.',
        content: `<h2>1. Bỏ ăn trên 24 giờ</h2>
<p>Chó khỏe mạnh hiếm khi bỏ bữa. Nếu bé từ chối ăn hơn 24h, cần kiểm tra ngay.</p>
<h2>2. Tiêu chảy hoặc nôn mửa liên tục</h2>
<p>Vài lần trong ngày không đáng lo, nhưng nếu kèm máu hoặc kéo dài hơn 12h, cần đi khám.</p>
<h2>3. Uống nước bất thường</h2>
<p>Uống quá nhiều hoặc quá ít đều là dấu hiệu: có thể liên quan đến tiểu đường, bệnh thận.</p>
<h2>4. Mũi khô, nóng</h2>
<p>Bình thường mũi chó ẩm và mát. Mũi khô liên tục + hắt xì = cần theo dõi.</p>
<h2>5. Đi khập khiễng</h2>
<p>Có thể do chấn thương, gai đâm, hoặc viêm khớp ở chó lớn tuổi.</p>
<h2>6. Thở bất thường</h2>
<p>Thở dốc khi nghỉ ngơi, thở khò khè — có thể là dấu hiệu tim mạch hoặc hô hấp.</p>
<h2>Lời khuyên</h2>
<p>Khám định kỳ 6 tháng/lần giúp phát hiện sớm mọi vấn đề sức khỏe trước khi trở nên nghiêm trọng.</p>`,
    },
    {
        title: 'Lợi Ích Của Việc Nuôi Thú Cưng Với Trẻ Em',
        slug: 'loi-ich-cua-viec-nuoi-thu-cuong-voi-tre-em',
        tags: ['gia đình', 'trẻ em', 'sức khỏe tâm lý'],
        thumbnail: 'https://images.unsplash.com/photo-1503256207526-0d5523f31580?w=800&h=450&fit=crop',
        excerpt: 'Khoa học đã chứng minh nhiều lợi ích về tâm lý và thể chất khi trẻ em lớn lên cùng thú cưng.',
        content: `<h2>Phát triển cảm xúc</h2>
<p>Trẻ nuôi thú cưng phát triển tốt hơn về sự đồng cảm — học cách đọc cảm xúc của động vật giúp hiểu cảm xúc người khác.</p>
<h2>Tăng cường hệ miễn dịch</h2>
<p>Nghiên cứu tại Đại học Michigan cho thấy trẻ sống cùng chó có nguy cơ hen suyễn và dị ứng thấp hơn 33%.</p>
<h2>Học trách nhiệm</h2>
<p>Chăm sóc thú cưng dạy trẻ về trách nhiệm, kỷ luật thời gian và sự nhất quán — kỹ năng quan trọng cho cuộc sống.</p>
<h2>Giảm lo âu và stress</h2>
<p>Vuốt ve thú cưng giảm cortisol (hormone stress) và tăng oxytocin. Đặc biệt hữu ích cho trẻ tự kỷ và rối loạn lo âu.</p>
<h2>Tăng vận động</h2>
<p>Trẻ nuôi chó đi bộ nhiều hơn ~30 phút/ngày so với trẻ không nuôi pet.</p>`,
    },
    {
        title: 'Hướng Dẫn Tắm Cho Mèo Mà Không Bị Cào',
        slug: 'huong-dan-tam-cho-meo-ma-khong-bi-cao',
        tags: ['mèo', 'vệ sinh', 'mẹo hay'],
        thumbnail: 'https://images.unsplash.com/photo-1545249390-6bdfa286032f?w=800&h=450&fit=crop',
        excerpt: 'Kỹ thuật tắm mèo an toàn cho cả người và mèo — ngay cả với những chú mèo ghét nước nhất.',
        content: `<h2>Mèo có cần tắm không?</h2>
<p>Mèo tự vệ sinh rất tốt. Thông thường chỉ cần tắm 1–2 lần/tháng, hoặc khi bé dây bẩn. Mèo lông dài cần tắm thường xuyên hơn mèo lông ngắn.</p>
<h2>Chuẩn bị trước khi tắm</h2>
<ul>
<li>Cắt móng vuốt ít nhất 30 phút trước</li>
<li>Chải lông để loại bỏ lông rụng</li>
<li>Chuẩn bị dầu gội chuyên dụng cho mèo (không dùng dầu gội người)</li>
<li>Nước ấm 35–38°C</li>
</ul>
<h2>Kỹ thuật tắm đúng</h2>
<p>Bắt đầu từ đuôi lên đầu, tránh nước vào tai mắt. Dùng cốc nhỏ thay vòi sen để tránh tiếng ồn. Massage nhẹ nhàng khi gội.</p>
<h2>Sấy khô</h2>
<p>Giữ mèo trong khăn bông ấm trước. Sấy máy ở nhiệt độ thấp, giữ cách xa 30cm. Không để mèo ra ngoài lạnh khi còn ướt.</p>`,
    },
    {
        title: 'Phụ Kiện Pet Cần Thiết Cho Năm 2025',
        slug: 'phu-kien-pet-can-thiet-cho-nam-2025',
        tags: ['phụ kiện', 'mua sắm', 'chó', 'mèo'],
        thumbnail: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800&h=450&fit=crop',
        excerpt: 'Danh sách các phụ kiện thú cưng thông minh và hữu ích nhất bạn nên đầu tư trong năm 2025.',
        content: `<h2>1. Camera theo dõi thú cưng thông minh</h2>
<p>Xem trực tiếp khi đi làm, một số loại còn có chức năng phóng treat tự động. Giá từ 500k–2 triệu VNĐ.</p>
<h2>2. Máy cho ăn tự động</h2>
<p>Lập trình giờ ăn, kiểm soát khẩu phần — lý tưởng cho chủ nhân bận rộn. Nên chọn loại có camera tích hợp.</p>
<h2>3. Đài phun nước lọc</h2>
<p>Nhiều thú cưng không đủ nước vì không thích nước đứng. Đài phun nước khuyến khích uống nhiều hơn, tốt cho thận.</p>
<h2>4. Balo/túi vận chuyển thông gió</h2>
<p>Thiết kế thân thú cưng với cửa sổ lưới thoáng khí, đệm chống sốc. Cần thiết khi di chuyển xa.</p>
<h2>5. GPS collar</h2>
<p>Vòng cổ theo dõi vị trí real-time qua app — an tâm tuyệt đối khi thú cưng ra ngoài sân.</p>
<h2>6. Máy lọc không khí chuyên dụng</h2>
<p>Lọc lông, mùi và vi khuẩn — đặc biệt hữu ích cho người nhạy cảm hoặc dị ứng nhẹ.</p>`,
    },
    {
        title: 'Làm Sao Biết Thú Cưng Của Bạn Hạnh Phúc?',
        slug: 'lam-sao-biet-thu-cuong-cua-ban-hanh-phuc',
        tags: ['hành vi', 'cảm xúc', 'chăm sóc'],
        thumbnail: 'https://images.unsplash.com/photo-1548767797-d8c844163c4a?w=800&h=450&fit=crop',
        excerpt: 'Ngôn ngữ cơ thể và hành vi của thú cưng tiết lộ rất nhiều về trạng thái cảm xúc của chúng.',
        content: `<h2>Dấu hiệu chó hạnh phúc</h2>
<ul>
<li>Vẫy đuôi thoải mái, toàn thân vẫy theo</li>
<li>Mắt mở tự nhiên, ánh nhìn mềm</li>
<li>Thích chơi và chạy nhảy</li>
<li>Nằm ngửa để bạn xoa bụng</li>
<li>Ăn uống bình thường</li>
</ul>
<h2>Dấu hiệu mèo hạnh phúc</h2>
<ul>
<li>Nằm cuộn tròn gần bạn</li>
<li>Gừ gừ (purring) khi được vuốt</li>
<li>Nhìn chậm rồi nhắm mắt = nụ hôn mèo</li>
<li>Dùng đầu dụi vào bạn (head bunting)</li>
<li>Đuôi dựng thẳng khi đi lại</li>
</ul>
<h2>Khi nào thú cưng đang stress?</h2>
<p>Xe máy, âm thanh lớn, khách lạ, thay đổi môi trường — đều là nguyên nhân phổ biến. Tạo không gian ẩn náu yên tĩnh giúp bé điều tiết cảm xúc.</p>`,
    },
    {
        title: 'Cách Chọn Thú Cưng Phù Hợp Với Lối Sống Của Bạn',
        slug: 'cach-chon-thu-cuong-phu-hop-voi-loi-song-cua-ban',
        tags: ['lựa chọn', 'tư vấn', 'mới bắt đầu'],
        thumbnail: 'https://images.unsplash.com/photo-1520390138845-fd2d229dd553?w=800&h=450&fit=crop',
        excerpt: 'Trước khi "rước" thú cưng về nhà, hãy tự hỏi những câu hỏi này để tránh hối tiếc về sau.',
        content: `<h2>Câu hỏi cần tự trả lời</h2>
<ul>
<li>Bạn có bao nhiêu thời gian mỗi ngày?</li>
<li>Không gian sống của bạn rộng hay hẹp?</li>
<li>Ngân sách hàng tháng cho thú cưng là bao nhiêu?</li>
<li>Có ai trong nhà bị dị ứng lông không?</li>
<li>Bạn đi công tác thường xuyên không?</li>
</ul>
<h2>Chó hay Mèo?</h2>
<p><strong>Chó:</strong> Cần nhiều thời gian hơn, cần đi dạo hàng ngày, nhưng trung thành và gắn kết sâu sắc hơn.<br/>
<strong>Mèo:</strong> Độc lập hơn, phù hợp người đi làm cả ngày, ít tốn công chăm sóc hành vi.</p>
<h2>Lựa chọn ít phổ biến nhưng tuyệt vời</h2>
<p><strong>Hamster/Guinea pig:</strong> Lý tưởng cho nhà nhỏ, trẻ em.<br/>
<strong>Thỏ:</strong> Sạch sẽ, yên tĩnh, có thể huấn luyện dùng khay vệ sinh.<br/>
<strong>Chim:</strong> Không cần ra ngoài, tiếng hót dễ chịu, chi phí thấp.</p>
<h2>Nhận nuôi thay vì mua</h2>
<p>Hàng nghìn thú cưng đang chờ được nhận nuôi tại các trạm cứu trợ. Nhận nuôi tiết kiệm chi phí và mang lại ý nghĩa nhân đạo sâu sắc.</p>`,
    },
];

// ── main ───────────────────────────────────────────────────────────────────
async function main() {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log('✅ Connected to MongoDB');

    // Find any admin user to use as author
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
        console.error('❌ No admin user found. Create an admin account first, then re-run.');
        process.exit(1);
    }
    console.log(`👤 Using author: ${admin.username} (${admin._id})`);

    let created = 0;
    let skipped = 0;

    for (const p of posts) {
        const exists = await Post.findOne({ slug: p.slug });
        if (exists) {
            console.log(`⏭  Skipped (already exists): ${p.title}`);
            skipped++;
            continue;
        }
        await Post.create({ ...p, author: admin._id, type: 'blog', views: Math.floor(Math.random() * 800) + 50 });
        console.log(`✅ Created: ${p.title}`);
        created++;
    }

    console.log(`\n🎉 Done! ${created} posts created, ${skipped} skipped.`);
    await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
