// seedProducts.mjs  — run with: node seedProducts.mjs
// Inserts realistic pet-shop products into MongoDB.
// Reads MONGODB_URL from .env via dotenv.
// IMPORTANT: Run seedCategories.mjs first so that categories already exist.
import 'dotenv/config';
import mongoose from 'mongoose';

// ── Inline schemas (avoids ESM/CJS issues with the app) ──────────────────────
const categorySchema = new mongoose.Schema(
    { name: String, slug: String, image: String, description: String },
    { strict: false, timestamps: true },
);
const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);

const productSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        slug: { type: String, unique: true },
        description: { type: String, required: true },
        price: { type: Number, required: true },
        originalPrice: { type: Number },
        images: [{ type: String }],
        category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
        specifications: { type: Map, of: String },
        stock: { type: Number, required: true, default: 0 },
        sold: { type: Number, default: 0 },
        views: { type: Number, default: 0 },
        averageRating: { type: Number, default: 0 },
        reviewCount: { type: Number, default: 0 },
    },
    { timestamps: true },
);
const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

// ── helper ─────────────────────────────────────────────────────────────────
const toSlug = (s) =>
    s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim()
        .replace(/\s+/g, '-').replace(/-+/g, '-');

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = (min, max) => parseFloat((Math.random() * (max - min) + min).toFixed(1));

// ── product data ─────────────────────────────────────────────────────────────
// Category names MUST match exactly the `name` field in seedCategories.mjs:
// 'Chó' | 'Mèo' | 'Thỏ' | 'Hamster' | 'Vẹt' | 'Cá' | 'Phụ Kiện'
const productsByCategoryName = {

    // ════════════════════════════════════════════════════════════════
    // CHÓ
    // ════════════════════════════════════════════════════════════════
    'Chó': [
        {
            name: 'Royal Canin Medium Adult 4kg',
            description: 'Thức ăn hạt cao cấp dành cho chó trưởng thành tầm trung (12 tháng – 7 tuổi, cân nặng 11–25kg). Hạt có hình dạng thiết kế riêng giúp giảm mảng bám và cao răng. Hỗ trợ tiêu hóa với prebiotics, bảo vệ lông nhờ Omega 3 & 6, duy trì cơ địa lý tưởng và tăng cường miễn dịch với vitamin E. Thành phần chính: gia cầm khô, lúa mì, bột ngô, protein gia cầm thủy phân, dầu cá hồi.',
            price: 520000,
            originalPrice: 580000,
            images: [
                'https://images.unsplash.com/photo-1568640347023-a616a30bc3bd?w=800&h=800&fit=crop',
                'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800&h=800&fit=crop',
            ],
            specifications: new Map([
                ['Thương hiệu', 'Royal Canin'],
                ['Trọng lượng', '4kg'],
                ['Độ tuổi phù hợp', 'Trưởng thành (12 tháng – 7 tuổi)'],
                ['Cân nặng phù hợp', '11 – 25kg'],
                ['Xuất xứ', 'Pháp'],
                ['Hạn sử dụng', '18 tháng'],
            ]),
            stockBase: 80, soldBase: 340,
        },
        {
            name: 'Pedigree Dentastix Bánh Thưởng Sạch Răng Chó Lớn 180g',
            description: 'Bánh thưởng chăm sóc răng miệng hàng ngày cho chó trên 10kg. Hình dạng X độc đáo và kết cấu đặc biệt giúp làm sạch tới 80% mảng bám và cao răng. Được khuyến nghị bởi các chuyên gia thú y. Hương vị gà & rau thơm thú cưng yêu thích, hàm lượng chất béo thấp dưới 2%. Dùng 1 thanh mỗi ngày, không thay thế bữa ăn chính.',
            price: 65000,
            originalPrice: 75000,
            images: [
                'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&h=800&fit=crop',
            ],
            specifications: new Map([
                ['Thương hiệu', 'Pedigree'],
                ['Trọng lượng', '180g (7 thanh)'],
                ['Hương vị', 'Thịt gà & rau thơm'],
                ['Phù hợp', 'Chó lớn hơn 10kg'],
                ['Xuất xứ', 'Thái Lan'],
            ]),
            stockBase: 200, soldBase: 870,
        },
        {
            name: 'Orijen Original Thức Ăn Chó Trưởng Thành 2kg',
            description: 'Thức ăn sinh học cao cấp với 85% nguyên liệu từ động vật tươi. Orijen lấy cảm hứng từ chế độ ăn tự nhiên của chó hoang dã, sử dụng gà, gà tây và cá tươi theo tỷ lệ WholePrey — bao gồm thịt, nội tạng và xương. Không chứa ngũ cốc, không phẩm màu, không chất bảo quản nhân tạo. Protein cao 38% từ nhiều nguồn động vật tươi. Phù hợp chó mọi giống và mọi độ tuổi.',
            price: 680000,
            originalPrice: 750000,
            images: [
                'https://images.unsplash.com/photo-1518155317743-a8ff43ea6a5f?w=800&h=800&fit=crop',
            ],
            specifications: new Map([
                ['Thương hiệu', 'Orijen'],
                ['Trọng lượng', '2kg'],
                ['Protein tối thiểu', '38%'],
                ['Loại', 'Grain-Free'],
                ['Xuất xứ', 'Canada'],
                ['Phù hợp', 'Mọi giống, mọi lứa tuổi'],
            ]),
            stockBase: 45, soldBase: 210,
        },
        {
            name: 'Taste of the Wild Pacific Stream 13.6kg',
            description: 'Thức ăn chó không ngũ cốc với cá hồi hun khói làm nguyên liệu chính. Tái hiện chế độ ăn nguyên thủy của chó, cung cấp Omega-3 và Omega-6 phong phú giúp lông bóng mượt và hỗ trợ chức năng não bộ. Bổ sung khoai lang và đậu Hà Lan thay thế ngũ cốc. Men vi sinh K9 Strain Probiotics hỗ trợ tiêu hóa. Không gluten, không phẩm màu nhân tạo.',
            price: 1_250_000,
            originalPrice: 1_380_000,
            images: [
                'https://images.unsplash.com/photo-1568640347023-a616a30bc3bd?w=800&h=800&fit=crop',
            ],
            specifications: new Map([
                ['Thương hiệu', 'Taste of the Wild'],
                ['Trọng lượng', '13.6kg'],
                ['Protein chính', 'Cá hồi hun khói'],
                ['Loại', 'Grain-Free'],
                ['Xuất xứ', 'Mỹ'],
            ]),
            stockBase: 30, soldBase: 95,
        },
        {
            name: 'Nexgard Spectra Thuốc Phòng Ve Bọ Chét Và Giun Tim Chó M (7.5–15kg)',
            description: 'Giải pháp bảo vệ toàn diện 8-trong-1 cho chó tầm trung. Phòng ngừa đồng thời 8 loại ký sinh trùng phổ biến trong một viên nhai duy nhất mỗi tháng. Hương thịt bò thật, chó tự ăn không cần ép. Diệt và phòng ngừa ve, bọ chét và trứng bọ chét, giun tim, giun đũa, giun móc, giun roi và ghẻ Sarcoptic. Tác dụng nhanh: tiêu diệt bọ chét trong 8 giờ, ve trong 24–48 giờ. Không dùng cho chó dưới 2kg hoặc dưới 8 tuần tuổi.',
            price: 280000,
            originalPrice: 320000,
            images: [
                'https://images.unsplash.com/photo-1596854372001-3b3bef5b7c37?w=800&h=800&fit=crop',
            ],
            specifications: new Map([
                ['Thương hiệu', 'Nexgard (Boehringer Ingelheim)'],
                ['Dạng', 'Viên nhai'],
                ['Cân nặng phù hợp', '7.5 – 15kg'],
                ['Tần suất dùng', 'Mỗi 30 ngày'],
                ['Công dụng', 'Ve, bọ chét, giun tim, giun đũa'],
                ['Xuất xứ', 'Pháp'],
            ]),
            stockBase: 100, soldBase: 485,
        },
        {
            name: 'Anivital Cani Agil Viên Khớp Cho Chó Hộp 60 Viên',
            description: 'Thực phẩm bổ sung hỗ trợ sức khỏe khớp cho chó từ Đức. Phối hợp 5 thành phần thiên nhiên được lâm sàng chứng minh hỗ trợ tái tạo sụn khớp và giảm viêm. Glucosamine HCl 500mg tái tạo mô sụn, Chondroitin sulfate 400mg tăng độ đàn hồi, Omega-3 từ dầu cá hồi kháng viêm tự nhiên, Vitamin C & E chống oxy hóa. Phù hợp chó trưởng thành từ 1 tuổi và chó cao tuổi.',
            price: 375000,
            originalPrice: 430000,
            images: [
                'https://images.unsplash.com/photo-1518155317743-a8ff43ea6a5f?w=800&h=800&fit=crop',
            ],
            specifications: new Map([
                ['Thương hiệu', 'Anivital'],
                ['Dạng', 'Viên nhai'],
                ['Số lượng', '60 viên/hộp'],
                ['Thành phần chính', 'Glucosamine, Chondroitin, Omega-3'],
                ['Phù hợp', 'Chó trưởng thành từ 1 tuổi'],
                ['Xuất xứ', 'Đức'],
            ]),
            stockBase: 75, soldBase: 280,
        },
        {
            name: 'Vòng Cổ Chó Chống Giật Reflective Julius-K9 IDC Size L',
            description: 'Vòng cổ phản quang Julius-K9 — thương hiệu số 1 châu Âu. Dây đai rộng 50mm, móc kim loại inox chịu lực, khóa an toàn hai tầng. Mặt vải phản quang 360 độ giúp chó dễ nhìn thấy trong đêm tối khi đi dạo chiều tối hoặc sáng sớm. Nhám chống trượt trên mặt trong vòng cổ. Phù hợp vòng cổ 45–65cm cho Labrador, Golden, Husky.',
            price: 320000,
            originalPrice: 380000,
            images: [
                'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=600&h=600&fit=crop',
            ],
            specifications: new Map([
                ['Thương hiệu', 'Julius-K9'],
                ['Size', 'L (45–65cm)'],
                ['Chất liệu', 'Nylon + phản quang 3M'],
                ['Màu', 'Đen / Cam / Đỏ'],
                ['Xuất xứ', 'Hungary'],
            ]),
            stockBase: 60, soldBase: 180,
        },
        {
            name: 'Chuồng Inox Ferplast Dog-Inn 75 Có Khay Chứa Phân',
            description: 'Chuồng inox cao cấp sản xuất tại Ý với thép inox phủ epoxy, cấu trúc vững chắc chịu được chó lớn. Khay chứa phân dạng trượt giúp vệ sinh trong 30 giây không cần tháo chuồng. Phù hợp chó nhỏ đến tầm trung dưới 15kg. Cửa đôi mở cả trên lẫn trước. Khay nhựa PP dưới đáy tháo rời và lưới chống tụ nước. Gập gọn 2 lần trong 10 giây khi di chuyển.',
            price: 780000,
            originalPrice: 920000,
            images: [
                'https://images.unsplash.com/photo-1548767797-d8c844163c4a?w=800&h=800&fit=crop',
            ],
            specifications: new Map([
                ['Thương hiệu', 'Ferplast'],
                ['Model', 'Dog-Inn 75'],
                ['Kích thước', '75 × 50 × 57cm'],
                ['Chất liệu', 'Inox phủ epoxy + nhựa PP'],
                ['Tải trọng', 'Chó đến 15kg'],
                ['Xuất xứ', 'Ý'],
            ]),
            stockBase: 25, soldBase: 62,
        },
        {
            name: 'Nệm Ngủ Tròn Calming Donut Bed Bedsure Size L 70cm',
            description: 'Ổ ngủ tròn lông xù siêu mềm giúp thú cưng cuộn tròn thoải mái và cảm thấy an toàn. Chất liệu faux fur siêu mịn tạo cảm giác ấm áp như lông mẹ. Viền tròn cao 20cm hỗ trợ đầu và cổ, giảm stress và lo âu. Nhân bông PP hypoallergenic không gây dị ứng, phục hồi hình dạng sau giặt. Đáy chống trượt. Giặt máy được ở 30 độ C.',
            price: 320000,
            originalPrice: 390000,
            images: [
                'https://images.unsplash.com/photo-1503256207526-0d5523f31580?w=800&h=800&fit=crop',
            ],
            specifications: new Map([
                ['Thương hiệu', 'Bedsure'],
                ['Size', 'L (đường kính 70cm)'],
                ['Chất liệu', 'Faux Fur + bông PP hypoallergenic'],
                ['Màu', 'Xám / Nâu / Hồng / Kem'],
                ['Giặt máy', 'Được (30°C)'],
            ]),
            stockBase: 70, soldBase: 265,
        },
        {
            name: 'Tông Đơ Cắt Lông Chó Oneisall A5 Không Dây 4 Tốc Độ',
            description: 'Tông đơ chuyên nghiệp dùng tại nhà dành cho thú cưng nhạy cảm với tiếng ồn. Motor không chổi than vận hành cực êm chỉ 45dB, 4 tốc độ tùy chỉnh, pin lithium-ion 2000mAh dùng đến 3 giờ liên tục. Lưỡi inox kết hợp ceramic tự mài sắc, chống gỉ và nhiệt. Bộ 4 lưỡi thay thế 3mm, 6mm, 9mm, 12mm kèm theo. Thân máy chống nước IPX5.',
            price: 485000,
            originalPrice: 580000,
            images: [
                'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800&h=800&fit=crop',
            ],
            specifications: new Map([
                ['Thương hiệu', 'Oneisall'],
                ['Model', 'A5'],
                ['Tốc độ', '4 mức'],
                ['Pin', '2000mAh, dùng ~3 giờ'],
                ['Chống nước', 'IPX5'],
                ['Bao gồm', '4 lưỡi thay thế + bàn chải làm sạch'],
            ]),
            stockBase: 55, soldBase: 195,
        },
    ],

    // ════════════════════════════════════════════════════════════════
    // MÈO
    // ════════════════════════════════════════════════════════════════
    'Mèo': [
        {
            name: 'Royal Canin Kitten 2kg',
            description: 'Thức ăn hạt dành riêng cho mèo con từ 4 đến 12 tháng tuổi. Hạt nhỏ và mềm phù hợp với hàm răng và hệ tiêu hóa còn non nớt. Protein cao 36% hỗ trợ phát triển cơ bắp. DHA từ dầu cá hỗ trợ não bộ và thị giác. Prebiotics và protein dễ tiêu hóa giúp phân đặc và giảm mùi. Colostrum tăng cường hệ miễn dịch trong giai đoạn cai sữa.',
            price: 280000,
            originalPrice: 320000,
            images: [
                'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800&h=800&fit=crop',
                'https://images.unsplash.com/photo-1548767797-d8c844163c4a?w=800&h=800&fit=crop',
            ],
            specifications: new Map([
                ['Thương hiệu', 'Royal Canin'],
                ['Trọng lượng', '2kg'],
                ['Độ tuổi phù hợp', 'Mèo con 4–12 tháng'],
                ['Protein tối thiểu', '36%'],
                ['Xuất xứ', 'Pháp'],
            ]),
            stockBase: 120, soldBase: 560,
        },
        {
            name: 'Whiskas Pate Cá Ngừ & Cà Rốt Gói 85g (Thùng 24 gói)',
            description: 'Pate ướt Whiskas với hương vị cá ngừ tươi ngon kết hợp cà rốt. Hàm lượng nước cao 75% giúp mèo hấp thu đủ nước, đặc biệt quan trọng cho mèo không thích uống nước. Kết cấu mềm mịn phù hợp cả mèo con và mèo già. Không chứa hương liệu nhân tạo, không chất bảo quản. Taurine bổ sung hỗ trợ sức khỏe tim mạch và thị giác.',
            price: 168000,
            originalPrice: 192000,
            images: [
                'https://images.unsplash.com/photo-1596854372001-3b3bef5b7c37?w=800&h=800&fit=crop',
            ],
            specifications: new Map([
                ['Thương hiệu', 'Whiskas'],
                ['Trọng lượng', '85g × 24 gói = 2.04kg'],
                ['Hương vị', 'Cá ngừ & Cà rốt'],
                ['Phù hợp', 'Mèo từ 1 tuổi trở lên'],
                ['Xuất xứ', 'Thái Lan'],
            ]),
            stockBase: 150, soldBase: 720,
        },
        {
            name: 'Ciao Churu Súp Thưởng Mèo Vị Gà & Phô Mai 56g (14 tuýp)',
            description: 'Súp thưởng Ciao Churu nổi tiếng toàn cầu với kết cấu sánh mịn, hàm lượng nước cao giúp mèo hydrat hóa tự nhiên. Thành phần chính là thịt gà ức thật và phô mai cream. Không ngũ cốc, không gluten, không phẩm màu nhân tạo. Chỉ khoảng 15 kcal mỗi tuýp, phù hợp mèo thừa cân. Dùng cho thẳng từ tay, trộn vào thức ăn khô hoặc làm phần thưởng khi huấn luyện.',
            price: 85000,
            originalPrice: 98000,
            images: [
                'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800&h=800&fit=crop',
            ],
            specifications: new Map([
                ['Thương hiệu', 'Ciao (Inaba)'],
                ['Trọng lượng', '4g × 14 tuýp = 56g'],
                ['Hương vị', 'Thịt gà & Phô mai'],
                ['Loại', 'Grain-Free'],
                ['Xuất xứ', 'Nhật Bản'],
            ]),
            stockBase: 300, soldBase: 1500,
        },
        {
            name: 'Nhà Cào Móng Mèo PetFusion Ultimate Cat Scratcher Lounge',
            description: 'Ghế nằm kiêm cào móng cao cấp với hình dáng ergonomic giúp mèo thoải mái duỗi người cào móng đầy đủ. Làm từ 65% bìa carton tái chế nén mật độ cao, bền gấp 3–4 lần bìa thường. Kích thước lớn 86 × 26 × 15cm phù hợp mọi giống mèo. Có thể lật ngược để sử dụng cả hai mặt, tăng tuổi thọ gấp đôi. Bảo vệ sofa và đồ gỗ trong nhà. Catnip hữu cơ đi kèm để hút mèo sử dụng ngay.',
            price: 450000,
            originalPrice: 520000,
            images: [
                'https://images.unsplash.com/photo-1545249390-6bdfa286032f?w=800&h=800&fit=crop',
            ],
            specifications: new Map([
                ['Thương hiệu', 'PetFusion'],
                ['Kích thước', '86 × 26 × 15cm'],
                ['Chất liệu', 'Carton nén tái chế'],
                ['Màu', 'Nâu tự nhiên'],
                ['Bao gồm', 'Catnip hữu cơ'],
                ['Xuất xứ', 'Mỹ'],
            ]),
            stockBase: 50, soldBase: 230,
        },
        {
            name: 'Đồ Chơi Mèo Tương Tác Laser & Lông Vũ Tự Động BENTOPAL P08',
            description: 'Robot đồ chơi tự động 360 độ kết hợp con trỏ laser và lông vũ vật lý tạo chuyển động ngẫu nhiên, kích thích bản năng săn mồi tự nhiên của mèo. Ba chế độ hoạt động: tự động, điều khiển từ xa và hẹn giờ. Tự ngủ sau 15 phút bảo vệ mắt mèo. Vận hành êm ái dưới 35dB. Sạc USB-C, pin 800mAh dùng 3–4 giờ mỗi lần sạc.',
            price: 350000,
            originalPrice: 420000,
            images: [
                'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800&h=800&fit=crop',
            ],
            specifications: new Map([
                ['Thương hiệu', 'BENTOPAL'],
                ['Model', 'P08'],
                ['Pin', '800mAh USB-C'],
                ['Chế độ hoạt động', 'Tự động / Điều khiển từ xa'],
                ['Tiếng ồn', '< 35dB'],
                ['Xuất xứ', 'Trung Quốc'],
            ]),
            stockBase: 80, soldBase: 415,
        },
        {
            name: 'Sữa Tắm Khô Chó Mèo Bio-Groom Super White 284ml',
            description: 'Sữa tắm khô chuyên nghiệp cho thú cưng lông trắng và lông nhạt màu. Công thức đặc biệt tẩy ố vàng, làm sáng và bồng bềnh lông mà không cần nước. Loại bỏ vết ố vàng và nâu do nước mắt, nước bọt và đất. Không chứa Chlorine, an toàn cho da nhạy cảm. Hương thơm nhẹ nhàng kéo dài 2–3 ngày. Tiện lợi giữa các lần tắm chính.',
            price: 220000,
            originalPrice: 260000,
            images: [
                'https://images.unsplash.com/photo-1535591273668-578e31182c4f?w=800&h=800&fit=crop',
            ],
            specifications: new Map([
                ['Thương hiệu', 'Bio-Groom'],
                ['Dung tích', '284ml'],
                ['Loại lông', 'Lông trắng / Lông nhạt màu'],
                ['Loại', 'Sữa tắm khô (không cần nước)'],
                ['Xuất xứ', 'Mỹ'],
            ]),
            stockBase: 90, soldBase: 340,
        },
        {
            name: 'Đệm Nằm Mèo Self-Warming Thermal Ổ Mèo Igloo Cat Cave Size M',
            description: 'Ổ mèo hình hang động ấm áp với lớp lót phản nhiệt tự làm ấm mà không cần điện, phù hợp mèo thích nơi kín đáo và tối để ngủ. Cửa vào có màn treo bảo vệ tránh gió lùa. Mặt ngoài len dệt cao cấp mềm mịn. Có thể gấp bằng phẳng giặt máy ở 30 độ C. Phù hợp mèo đến 5kg.',
            price: 270000,
            originalPrice: 320000,
            images: [
                'https://images.unsplash.com/photo-1545249390-6bdfa286032f?w=800&h=800&fit=crop',
            ],
            specifications: new Map([
                ['Thương hiệu', 'K&H Pet Products'],
                ['Size', 'M (35 × 35 × 30cm)'],
                ['Chất liệu', 'Len dệt + lớp phản nhiệt'],
                ['Tải trọng', 'Mèo đến 5kg'],
                ['Giặt máy', 'Được (30°C)'],
                ['Xuất xứ', 'Mỹ'],
            ]),
            stockBase: 65, soldBase: 198,
        },
    ],

    // ════════════════════════════════════════════════════════════════
    // THỎ
    // ════════════════════════════════════════════════════════════════
    'Thỏ': [
        {
            name: 'Thức Ăn Viên Cho Thỏ Oxbow Essentials Adult Rabbit 1.8kg',
            description: 'Thức ăn viên dinh dưỡng hàng ngày dành cho thỏ trưởng thành từ 1 tuổi trở lên, được khuyến nghị bởi các bác sĩ thú y chuyên về thỏ. Thành phần chính từ cỏ Timothy giàu chất xơ hỗ trợ tiêu hóa khỏe mạnh và mòn răng tự nhiên. Không chứa hạt, hoa quả khô hay đường bổ sung. Bổ sung vitamin D3 và canxi cân bằng bảo vệ xương và răng.',
            price: 320000,
            originalPrice: 370000,
            images: [
                'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=800&h=800&fit=crop',
            ],
            specifications: new Map([
                ['Thương hiệu', 'Oxbow'],
                ['Trọng lượng', '1.8kg'],
                ['Thành phần chính', 'Cỏ Timothy'],
                ['Phù hợp', 'Thỏ trưởng thành từ 1 tuổi'],
                ['Xuất xứ', 'Mỹ'],
                ['Hạn sử dụng', '12 tháng'],
            ]),
            stockBase: 60, soldBase: 210,
        },
        {
            name: 'Cỏ Khô Timothy Oxbow Western Timothy Hay 425g',
            description: 'Cỏ khô Timothy chất lượng cao chiếm 70–80% khẩu phần ăn của thỏ mỗi ngày, cung cấp chất xơ thô cần thiết cho hệ tiêu hóa và giúp mòn răng tự nhiên. Thu hoạch từ trang trại Mỹ, phơi khô tự nhiên, không chứa hóa chất. Lá xanh mướt thơm mát, thỏ rất thích ăn. Phù hợp thỏ, chuột lang và chinchilla.',
            price: 95000,
            originalPrice: 115000,
            images: [
                'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=800&h=800&fit=crop',
            ],
            specifications: new Map([
                ['Thương hiệu', 'Oxbow'],
                ['Trọng lượng', '425g'],
                ['Loại cỏ', 'Timothy (loại 2)'],
                ['Phù hợp', 'Thỏ, chuột lang, chinchilla'],
                ['Xuất xứ', 'Mỹ'],
            ]),
            stockBase: 150, soldBase: 620,
        },
        {
            name: 'Chuồng Thỏ 2 Tầng Có Máng Ăn Uống Midwest Wabbitat Deluxe',
            description: 'Chuồng thỏ 2 tầng rộng rãi với lối đi dốc giữa 2 tầng, cửa trên và cửa trước tiện lợi để vệ sinh. Sàn lưới chống trượt bảo vệ chân thỏ, khay nhựa phía dưới tháo rời giặt được. Kích thước tổng thể 81 × 52 × 88cm, phù hợp 1–2 thỏ nhỏ hoặc 1 thỏ tầm trung. Bao gồm máng ăn gắn thành và bình nước nhỏ giọt.',
            price: 650000,
            originalPrice: 780000,
            images: [
                'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=800&h=800&fit=crop',
            ],
            specifications: new Map([
                ['Thương hiệu', 'Midwest Homes'],
                ['Model', 'Wabbitat Deluxe'],
                ['Kích thước', '81 × 52 × 88cm'],
                ['Số tầng', '2 tầng'],
                ['Bao gồm', 'Máng ăn + bình nước nhỏ giọt'],
                ['Xuất xứ', 'Mỹ'],
            ]),
            stockBase: 30, soldBase: 75,
        },
        {
            name: 'Cát Vệ Sinh Thỏ Bỏng Ngô Carefresh Natural 10L',
            description: 'Chất độn chuồng làm từ bỏng ngô tái chế, mềm mại và nhẹ nhàng với bàn chân thỏ. Khả năng thấm hút gấp 3 lần cát gỗ thông thường, kiểm soát mùi hiệu quả đến 10 ngày. Không bụi, không chứa hóa chất tẩy trắng, an toàn nếu thỏ vô tình ăn phải. Phân hủy sinh học hoàn toàn, thân thiện môi trường.',
            price: 180000,
            originalPrice: 210000,
            images: [
                'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=800&h=800&fit=crop',
            ],
            specifications: new Map([
                ['Thương hiệu', 'Carefresh'],
                ['Dung tích', '10 Lít'],
                ['Thành phần', 'Bỏng ngô tái chế'],
                ['Kiểm soát mùi', 'Đến 10 ngày'],
                ['Xuất xứ', 'Mỹ'],
            ]),
            stockBase: 100, soldBase: 380,
        },
        {
            name: 'Đồ Chơi Cắn Gặm Thỏ Bộ 5 Món Kaytee Chew & Toss',
            description: 'Bộ đồ chơi cắn gặm 5 món đa dạng chất liệu: gỗ tự nhiên, lá dứa khô, dây đay và rơm tết. Giúp thỏ mài răng, giải trí và tránh chán nản khi ở trong chuồng. Không sơn phủ, không hóa chất, hoàn toàn an toàn khi thỏ ăn vào. Kết hợp nhiều hình dạng và kết cấu để kích thích bản năng khám phá của thỏ.',
            price: 125000,
            originalPrice: 150000,
            images: [
                'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=800&h=800&fit=crop',
            ],
            specifications: new Map([
                ['Thương hiệu', 'Kaytee'],
                ['Số lượng', '5 món'],
                ['Chất liệu', 'Gỗ tự nhiên, lá dứa, dây đay, rơm'],
                ['Phù hợp', 'Thỏ, hamster, chuột lang'],
                ['Xuất xứ', 'Mỹ'],
            ]),
            stockBase: 120, soldBase: 445,
        },
    ],

    // ════════════════════════════════════════════════════════════════
    // HAMSTER
    // ════════════════════════════════════════════════════════════════
    'Hamster': [
        {
            name: 'Lồng Nuôi Hamster Favola Habitrail Ovo Suite 47x32x25cm',
            description: 'Lồng nuôi hamster thiết kế mô-đun hiện đại, có thể kết nối mở rộng với các module Habitrail khác. Kích thước rộng rãi 47 × 32 × 25cm phù hợp hamster Syrian và hamster Dwarf. Bao gồm bánh xe chạy im lặng đường kính 17cm, máng ăn treo và bình nước nhỏ giọt 100ml. Cửa trên rộng, nắp kính perspex trong suốt tiện quan sát.',
            price: 420000,
            originalPrice: 490000,
            images: [
                'https://images.unsplash.com/photo-1425082661705-1834bfd09dca?w=800&h=800&fit=crop',
            ],
            specifications: new Map([
                ['Thương hiệu', 'Habitrail'],
                ['Kích thước', '47 × 32 × 25cm'],
                ['Phù hợp', 'Hamster Syrian & Dwarf'],
                ['Bao gồm', 'Bánh xe, máng ăn, bình nước'],
                ['Xuất xứ', 'Canada'],
            ]),
            stockBase: 45, soldBase: 160,
        },
        {
            name: 'Thức Ăn Hỗn Hợp Hamster Versele-Laga Complete Hamster 800g',
            description: 'Thức ăn hỗn hợp dinh dưỡng đầy đủ dành cho hamster Syrian và hamster Dwarf. Công thức Complete bao gồm hạt ngũ cốc, rau củ sấy khô, côn trùng khô và hoa quả để cung cấp dinh dưỡng đa dạng. Tỷ lệ protein 14%, chất béo 7%, chất xơ 6%. Không cần bổ sung vitamin thêm khi dùng sản phẩm này.',
            price: 145000,
            originalPrice: 170000,
            images: [
                'https://images.unsplash.com/photo-1425082661705-1834bfd09dca?w=800&h=800&fit=crop',
            ],
            specifications: new Map([
                ['Thương hiệu', 'Versele-Laga'],
                ['Trọng lượng', '800g'],
                ['Protein', '14%'],
                ['Phù hợp', 'Hamster Syrian & Dwarf'],
                ['Xuất xứ', 'Bỉ'],
            ]),
            stockBase: 90, soldBase: 360,
        },
        {
            name: 'Bánh Xe Chạy Hamster Im Lặng Niteangel Super-Silent 25cm',
            description: 'Bánh xe chạy cao cấp đường kính 25cm, phù hợp hamster Syrian trưởng thành. Công nghệ double-ball-bearing chạy hoàn toàn yên lặng. Mặt chạy rộng bằng phẳng không có nan hở bảo vệ chân hamster. Màu sắc pastel dễ thương. Lắp ráp đứng độc lập hoặc gắn thành lồng. Vật liệu nhựa ABS không mùi, an toàn cho hamster cắn gặm.',
            price: 185000,
            originalPrice: 220000,
            images: [
                'https://images.unsplash.com/photo-1425082661705-1834bfd09dca?w=800&h=800&fit=crop',
            ],
            specifications: new Map([
                ['Thương hiệu', 'Niteangel'],
                ['Đường kính', '25cm'],
                ['Phù hợp', 'Hamster Syrian'],
                ['Màu sắc', 'Xanh / Hồng / Vàng / Xám'],
                ['Xuất xứ', 'Trung Quốc'],
            ]),
            stockBase: 80, soldBase: 310,
        },
        {
            name: 'Chất Độn Chuồng Hamster Carefresh Ultra 10L Màu Trắng',
            description: 'Chất độn chuồng sợi bông trắng mềm mại đặc biệt phù hợp hamster và chuột nhắt. Thấm hút tốt gấp 3 lần chất độn thông thường, kiểm soát amoniac hiệu quả giữ lồng không mùi. Sợi mềm như bông không gây kích ứng da và mắt của hamster nhỏ. Không bụi, không dính như bông thông thường. Phân hủy sinh học hoàn toàn.',
            price: 160000,
            originalPrice: 190000,
            images: [
                'https://images.unsplash.com/photo-1425082661705-1834bfd09dca?w=800&h=800&fit=crop',
            ],
            specifications: new Map([
                ['Thương hiệu', 'Carefresh'],
                ['Dung tích', '10 Lít'],
                ['Màu', 'Trắng'],
                ['Thành phần', 'Sợi cellulose tái chế'],
                ['Xuất xứ', 'Mỹ'],
            ]),
            stockBase: 110, soldBase: 430,
        },
        {
            name: 'Nhà Gỗ Hamster Niteangel Hideout Cabin S',
            description: 'Nhà gỗ tự nhiên nhỏ xinh tạo không gian riêng tư để hamster ngủ và nghỉ ngơi. Làm từ gỗ thông chưa qua xử lý hóa học, an toàn khi hamster cắn. Cửa tròn đường kính 4cm phù hợp mọi giống hamster. Mái phẳng có thể dùng làm bệ ngồi. Tháo rời để vệ sinh dễ dàng. Kích thước 12 × 9 × 9cm.',
            price: 75000,
            originalPrice: 90000,
            images: [
                'https://images.unsplash.com/photo-1425082661705-1834bfd09dca?w=800&h=800&fit=crop',
            ],
            specifications: new Map([
                ['Thương hiệu', 'Niteangel'],
                ['Kích thước', '12 × 9 × 9cm'],
                ['Chất liệu', 'Gỗ thông tự nhiên'],
                ['Đường kính cửa', '4cm'],
                ['Xuất xứ', 'Trung Quốc'],
            ]),
            stockBase: 130, soldBase: 520,
        },
    ],

    // ════════════════════════════════════════════════════════════════
    // VẸT
    // ════════════════════════════════════════════════════════════════
    'Vẹt': [
        {
            name: 'Lồng Vẹt Prevue Hendryx Flight Cage F040 91x56x160cm',
            description: 'Lồng vẹt cỡ lớn thích hợp cho các giống vẹt nhỏ và vừa như Conure, Cockatiel, Lovebird. Khung thép phủ sơn epoxy không độc hại, thanh ngang cách nhau 1.9cm an toàn không kẹt đầu chim. Cửa to rộng tiện chăm sóc, 4 khay thức ăn tháo lắp và 2 que đậu gỗ đi kèm. Bánh xe lăn bên dưới di chuyển dễ dàng.',
            price: 1_850_000,
            originalPrice: 2_200_000,
            images: [
                'https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=800&h=800&fit=crop',
            ],
            specifications: new Map([
                ['Thương hiệu', 'Prevue Hendryx'],
                ['Kích thước', '91 × 56 × 160cm'],
                ['Khoảng cách thanh', '1.9cm'],
                ['Bao gồm', '4 máng ăn + 2 que đậu gỗ'],
                ['Xuất xứ', 'Mỹ'],
            ]),
            stockBase: 15, soldBase: 32,
        },
        {
            name: 'Thức Ăn Vẹt Zupreem Natural Pelleted Bird Food Medium 906g',
            description: 'Thức ăn viên nén dinh dưỡng hoàn chỉnh dành cho vẹt Conure, Caique, Lovebird và các giống vẹt cỡ nhỏ đến trung. Mỗi viên chứa đủ 40 loại vitamin, khoáng chất và axit amin thiết yếu. Không chứa hương liệu nhân tạo, không phẩm màu. Công thức Natural từ ngũ cốc, đậu và hoa quả. Được khuyến nghị bởi bác sĩ thú y chuyên về chim toàn cầu.',
            price: 310000,
            originalPrice: 360000,
            images: [
                'https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=800&h=800&fit=crop',
            ],
            specifications: new Map([
                ['Thương hiệu', 'Zupreem'],
                ['Trọng lượng', '906g'],
                ['Phù hợp', 'Vẹt cỡ nhỏ–vừa: Conure, Caique, Lovebird'],
                ['Loại', 'Viên nén (Pellet)'],
                ['Xuất xứ', 'Mỹ'],
            ]),
            stockBase: 55, soldBase: 180,
        },
        {
            name: 'Đồ Chơi Vẹt Foraging Super Bird Creations Bucket O Goodies',
            description: 'Đồ chơi trí tuệ dạng foraging giúp vẹt giải trí và kích thích trí não. Thiết kế ống nhựa đục lỗ bên trong chứa thức ăn nhỏ, vẹt phải xoay và cắn để lấy phần thưởng. Màu sắc tươi sáng thu hút sự chú ý của chim. Làm từ nhựa ABS an toàn. Phù hợp Conure, Cockatiel và các giống vẹt tương đương.',
            price: 145000,
            originalPrice: 175000,
            images: [
                'https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=800&h=800&fit=crop',
            ],
            specifications: new Map([
                ['Thương hiệu', 'Super Bird Creations'],
                ['Kích thước', '7 × 7 × 20cm'],
                ['Chất liệu', 'Nhựa ABS + sợi thực vật'],
                ['Phù hợp', 'Conure, Cockatiel, Lovebird'],
                ['Xuất xứ', 'Mỹ'],
            ]),
            stockBase: 70, soldBase: 245,
        },
        {
            name: 'Khoáng Mực Ép Sepia Bone Tự Nhiên Cho Vẹt Và Chim Cảnh 100g',
            description: 'Khoáng mực ép tự nhiên (sepia bone) là nguồn bổ sung canxi và khoáng chất thiết yếu cho vẹt và chim cảnh. Giúp mài mỏ và móng, duy trì hàm lượng canxi cần thiết cho sinh sản và sức khỏe xương. Không chứa hóa chất, 100% tự nhiên từ mai mực biển. Gắn thành lồng bằng kẹp inox đi kèm. Phù hợp mọi giống chim cảnh.',
            price: 35000,
            originalPrice: 45000,
            images: [
                'https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=800&h=800&fit=crop',
            ],
            specifications: new Map([
                ['Thành phần', '100% mai mực tự nhiên'],
                ['Trọng lượng', '100g'],
                ['Công dụng', 'Bổ sung canxi, mài mỏ'],
                ['Phù hợp', 'Mọi giống vẹt và chim cảnh'],
                ['Xuất xứ', 'Ý'],
            ]),
            stockBase: 200, soldBase: 810,
        },
        {
            name: 'Que Đậu Gỗ Tự Nhiên Bộ 3 Cái Nhiều Đường Kính Java Wood Perch',
            description: 'Bộ 3 que đậu gỗ java tự nhiên với đường kính và hình dáng không đều tự nhiên, giúp vẹt luyện tập cơ chân và móng hiệu quả hơn que đậu tròn đều thông thường. Gỗ java bền, không mọt, bề mặt tự nhiên giúp mài móng nhẹ nhàng. Bao gồm đường kính 1.5cm, 2.5cm và 3.5cm. Gắn thành lồng bằng vít inox.',
            price: 185000,
            originalPrice: 220000,
            images: [
                'https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=800&h=800&fit=crop',
            ],
            specifications: new Map([
                ['Chất liệu', 'Gỗ Java tự nhiên'],
                ['Số lượng', '3 que/bộ'],
                ['Đường kính', '1.5cm / 2.5cm / 3.5cm'],
                ['Phù hợp', 'Vẹt cỡ nhỏ đến lớn'],
                ['Xuất xứ', 'Indonesia'],
            ]),
            stockBase: 85, soldBase: 310,
        },
    ],

    // ════════════════════════════════════════════════════════════════
    // CÁ
    // ════════════════════════════════════════════════════════════════
    'Cá': [
        {
            name: 'Bể Cá Kính Fluval Spec V 19L Trọn Bộ Có Lọc Và Đèn LED',
            description: 'Bể kính cao cấp all-in-one dành cho không gian bàn làm việc và kệ trang trí. Thiết kế low-profile sang trọng với kính cường lực 5mm. Hệ thống lọc 3 giai đoạn tích hợp phía sau tạo cảm giác kính trong suốt 360 độ. Đèn LED 7000K ánh sáng trắng tự nhiên với chế độ dimmer. Máy bơm lưu lượng 240 L/h êm ái. Bộ khởi động hoàn chỉnh bao gồm bể, nắp, lọc, đèn và hướng dẫn cycle nước.',
            price: 1_850_000,
            originalPrice: 2_100_000,
            images: [
                'https://images.unsplash.com/photo-1535591273668-578e31182c4f?w=800&h=800&fit=crop',
            ],
            specifications: new Map([
                ['Thương hiệu', 'Fluval'],
                ['Model', 'Spec V'],
                ['Thể tích', '19 Lít'],
                ['Kích thước', '52.1 × 18.6 × 30.5cm'],
                ['Đèn', 'LED 37 bóng 7000K'],
                ['Xuất xứ', 'Canada'],
            ]),
            stockBase: 20, soldBase: 45,
        },
        {
            name: 'Thức Ăn Cá Koi Hikari Gold Medium Pellet 500g',
            description: 'Thức ăn viên nổi cao cấp dành cho cá Koi và cá vàng cỡ trung đến lớn. Công thức Hikari Gold nổi tiếng giúp màu sắc cá rực rỡ hơn nhờ chất tăng màu tự nhiên spirulina và astaxanthin. Protein 35% từ cá biển đảm bảo tăng trưởng khỏe mạnh. Viên không làm đục nước, tiêu hóa tốt ít gây bẩn bể.',
            price: 245000,
            originalPrice: 290000,
            images: [
                'https://images.unsplash.com/photo-1535591273668-578e31182c4f?w=800&h=800&fit=crop',
            ],
            specifications: new Map([
                ['Thương hiệu', 'Hikari'],
                ['Trọng lượng', '500g'],
                ['Kích thước viên', 'Medium (6mm)'],
                ['Phù hợp', 'Cá Koi & Cá vàng trên 15cm'],
                ['Protein', '35%'],
                ['Xuất xứ', 'Nhật Bản'],
            ]),
            stockBase: 75, soldBase: 290,
        },
        {
            name: 'Máy Lọc Nước Bể Cá Canister Eheim Classic 250 2213',
            description: 'Máy lọc canister huyền thoại của Eheim, tiêu chuẩn vàng cho bể cá cảnh từ 80–250 lít. Hoạt động hoàn toàn im lặng nhờ motor rotor ceramic. Lưu lượng 440 lít/giờ. Bao gồm bộ media lọc đầy đủ 3 lớp: bông lọc thô, lọc sinh học Substrat Pro và lọc tinh. Ống và van nhựa chất lượng cao, dễ lắp đặt và bảo trì. Bảo hành 3 năm.',
            price: 1_450_000,
            originalPrice: 1_680_000,
            images: [
                'https://images.unsplash.com/photo-1535591273668-578e31182c4f?w=800&h=800&fit=crop',
            ],
            specifications: new Map([
                ['Thương hiệu', 'Eheim'],
                ['Model', 'Classic 250 / 2213'],
                ['Lưu lượng', '440 L/giờ'],
                ['Bể phù hợp', '80 – 250 lít'],
                ['Bảo hành', '3 năm'],
                ['Xuất xứ', 'Đức'],
            ]),
            stockBase: 25, soldBase: 68,
        },
        {
            name: 'Đèn LED Thuỷ Sinh Chlamys Planted 60cm 30W Full Spectrum',
            description: 'Đèn LED full spectrum thiết kế đặc biệt cho bể thuỷ sinh có cây trồng. Dải đèn LED kép phủ bước sóng 400–700nm (PAR cao) thúc đẩy quang hợp mạnh mẽ và màu sắc rực rỡ. Cường độ ánh sáng điều chỉnh 10 mức, hẹn giờ bật/tắt tích hợp mô phỏng chu kỳ ngày tự nhiên. Giá đỡ đa năng phù hợp bể từ 55–70cm.',
            price: 680000,
            originalPrice: 820000,
            images: [
                'https://images.unsplash.com/photo-1535591273668-578e31182c4f?w=800&h=800&fit=crop',
            ],
            specifications: new Map([
                ['Thương hiệu', 'Chlamys'],
                ['Công suất', '30W'],
                ['Phổ ánh sáng', 'Full Spectrum 400–700nm'],
                ['Chiều dài', '60cm'],
                ['Bể phù hợp', '55 – 70cm'],
                ['Xuất xứ', 'Trung Quốc'],
            ]),
            stockBase: 40, soldBase: 125,
        },
        {
            name: 'Phân Nền Thuỷ Sinh ADA Aqua Soil Amazonia Ver.2 3L',
            description: 'Phân nền cao cấp của hãng ADA Nhật Bản — tiêu chuẩn vàng cho bể thuỷ sinh. Thành phần từ đất núi lửa Amazonia giàu khoáng chất và hữu cơ, hỗ trợ rễ cây phát triển mạnh và tạo điều kiện pH hơi acid 6.5–7.0 lý tưởng cho hầu hết cây thuỷ sinh. Hạt kích thước 3mm chắc, ít vỡ vụn làm đục nước.',
            price: 480000,
            originalPrice: 550000,
            images: [
                'https://images.unsplash.com/photo-1535591273668-578e31182c4f?w=800&h=800&fit=crop',
            ],
            specifications: new Map([
                ['Thương hiệu', 'ADA'],
                ['Trọng lượng', '3 Lít (~3kg)'],
                ['Kích thước hạt', '3mm'],
                ['pH tạo ra', '6.5 – 7.0'],
                ['Xuất xứ', 'Nhật Bản'],
            ]),
            stockBase: 35, soldBase: 98,
        },
    ],

    // ════════════════════════════════════════════════════════════════
    // PHỤ KIỆN (đa năng — phù hợp mọi thú cưng)
    // ════════════════════════════════════════════════════════════════
    'Phụ Kiện': [
        {
            name: 'Balo Vận Chuyển Chó Mèo PETKIT Breezy Zone Size L',
            description: 'Ba lô thú cưng thông gió toàn diện với cửa sổ kính perspex trong suốt 270 độ cho thú cưng nhìn ra ngoài. Hệ thống thông gió lưới 3 chiều chống ngột ngạt. Tải trọng tối đa 8kg. Cửa hông và cửa trên tiện lợi với khóa kép an toàn. Dây đai vai đệm ergonomic phân tán trọng lượng. Cổng sạc USB tích hợp. Kích thước 32×28×46cm phù hợp mang lên máy bay cabin.',
            price: 890000,
            originalPrice: 1_050_000,
            images: [
                'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&h=800&fit=crop',
            ],
            specifications: new Map([
                ['Thương hiệu', 'PETKIT'],
                ['Size', 'L'],
                ['Tải trọng tối đa', '8kg'],
                ['Kích thước', '32 × 28 × 46cm'],
                ['Chất liệu', 'Polyester + lưới thoáng khí'],
                ['Màu', 'Xanh Navy / Xám / Đen'],
            ]),
            stockBase: 35, soldBase: 88,
        },
        {
            name: 'Máy Cho Ăn Tự Động Pet Feeder PetSafe Eatwell 5 Meal',
            description: 'Máy cho ăn tự động 5 ngăn xoay với hẹn giờ kỹ thuật số chính xác đến từng phút. Phù hợp cho chó và mèo cỡ nhỏ đến vừa, mỗi ngăn chứa tối đa 240ml thức ăn khô hoặc ẩm. Nắp ngăn kín giữ thức ăn tươi và ngăn thú cưng mở trước giờ ăn. Hoạt động bằng pin AA, tiết kiệm điện. Dễ tháo rời rửa bằng tay hoặc máy rửa bát.',
            price: 580000,
            originalPrice: 690000,
            images: [
                'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800&h=800&fit=crop',
            ],
            specifications: new Map([
                ['Thương hiệu', 'PetSafe'],
                ['Số ngăn', '5 ngăn'],
                ['Dung tích mỗi ngăn', '240ml'],
                ['Nguồn điện', 'Pin AA × 4'],
                ['Rửa máy bát', 'Được'],
                ['Xuất xứ', 'Mỹ'],
            ]),
            stockBase: 50, soldBase: 175,
        },
        {
            name: 'Cân Điện Tử Thú Cưng Pet Scale Renpho 10kg Độ Chính Xác 1g',
            description: 'Cân điện tử chuyên dụng cho thú cưng với mặt cân rộng 30 × 30cm và độ chính xác đến 1 gram. Theo dõi sức khỏe và cân nặng thú cưng hàng tuần. Màn hình LCD rõ ràng, chế độ tare bì thùng và bát. Kết nối Bluetooth với app RENPHO để lưu lịch sử cân nặng và vẽ biểu đồ. Chịu tải tối đa 10kg.',
            price: 350000,
            originalPrice: 420000,
            images: [
                'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&h=800&fit=crop',
            ],
            specifications: new Map([
                ['Thương hiệu', 'Renpho'],
                ['Tải trọng tối đa', '10kg'],
                ['Độ chính xác', '1g'],
                ['Kích thước mặt cân', '30 × 30cm'],
                ['Kết nối', 'Bluetooth + App'],
                ['Xuất xứ', 'Trung Quốc'],
            ]),
            stockBase: 60, soldBase: 220,
        },
        {
            name: 'Bình Nước Nhỏ Giọt Thú Cưng Hagen Exo Terra Water Dish 500ml',
            description: 'Bình nước nhỏ giọt 500ml dùng được cho thỏ, hamster, chinchilla, vẹt và các thú cưng nhỏ. Van nhỏ giọt inox không gỉ, lưu lượng điều chỉnh được. Bình nhựa trong suốt quan sát mực nước dễ dàng. Móc gắn thành lồng chắc chắn với nhiều kích thước khác nhau. Tháo rời hoàn toàn vệ sinh bằng cọ chai kèm theo.',
            price: 85000,
            originalPrice: 105000,
            images: [
                'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800&h=800&fit=crop',
            ],
            specifications: new Map([
                ['Thương hiệu', 'Hagen'],
                ['Dung tích', '500ml'],
                ['Chất liệu van', 'Inox không gỉ'],
                ['Phù hợp', 'Thỏ, hamster, chinchilla, vẹt'],
                ['Bao gồm', 'Cọ vệ sinh'],
            ]),
            stockBase: 180, soldBase: 720,
        },
        {
            name: 'Đèn Sưởi Hồng Ngoại Thú Cưng Reptizoo 50W',
            description: 'Bóng đèn sưởi hồng ngoại 50W phù hợp bò sát, chim cảnh, thỏ và các thú cưng cần nhiệt độ ổn định. Ánh sáng đỏ mờ không làm gián đoạn chu kỳ ngủ tự nhiên. Tỏa nhiệt đều và sâu, duy trì nhiệt độ chuồng ổn định ngay cả mùa đông. Kết hợp với đui đèn có công tắc và hẹn giờ để tối ưu hóa sử dụng điện. Tuổi thọ hơn 3000 giờ.',
            price: 95000,
            originalPrice: 120000,
            images: [
                'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&h=800&fit=crop',
            ],
            specifications: new Map([
                ['Thương hiệu', 'Reptizoo'],
                ['Công suất', '50W'],
                ['Loại ánh sáng', 'Hồng ngoại đỏ'],
                ['Tuổi thọ', '> 3000 giờ'],
                ['Phù hợp', 'Bò sát, thỏ, chim cảnh'],
                ['Xuất xứ', 'Trung Quốc'],
            ]),
            stockBase: 95, soldBase: 380,
        },
        {
            name: 'Thảm Vệ Sinh Thú Cưng Paw Inspired Ultra Protection 30 Tấm',
            description: 'Thảm vệ sinh thú cưng 30 tấm với 5 lớp thấm hút siêu cấp. Lớp polymer hấp thu nhanh khóa chất lỏng và loại bỏ mùi trong vài giây. Bề mặt êm ái khuyến khích thú cưng sử dụng đúng chỗ. Đáy chống trượt chống trôi khi thú cưng bước lên. Kích thước 60 × 60cm phù hợp chó nhỏ và mèo. Không chứa hóa chất tẩy trắng hay mùi hương nhân tạo.',
            price: 245000,
            originalPrice: 290000,
            images: [
                'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800&h=800&fit=crop',
            ],
            specifications: new Map([
                ['Thương hiệu', 'Paw Inspired'],
                ['Số lượng', '30 tấm/gói'],
                ['Kích thước', '60 × 60cm'],
                ['Số lớp', '5 lớp'],
                ['Đáy', 'Chống trượt'],
                ['Xuất xứ', 'Mỹ'],
            ]),
            stockBase: 120, soldBase: 490,
        },
    ],
};

// ── main ───────────────────────────────────────────────────────────────────
async function main() {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log('✅ Connected to MongoDB');

    // Load all categories into a lookup map { name -> ObjectId }
    const categoryDocs = await Category.find({});
    if (categoryDocs.length === 0) {
        console.error('❌ No categories found. Run seedCategories.mjs first.');
        process.exit(1);
    }
    const catMap = Object.fromEntries(categoryDocs.map((c) => [c.name, c._id]));
    console.log(`📦 Found ${categoryDocs.length} categories.`);

    let created = 0;
    let skipped = 0;

    for (const [categoryName, products] of Object.entries(productsByCategoryName)) {
        const categoryId = catMap[categoryName];
        if (!categoryId) {
            console.warn(`⚠️  Category not found in DB: "${categoryName}" — skipping its products.`);
            continue;
        }

        for (const p of products) {
            const computedSlug = toSlug(p.name);
            const exists = await Product.findOne({ slug: computedSlug });
            if (exists) {
                console.log(`⏭  Skipped (already exists): ${p.name}`);
                skipped++;
                continue;
            }

            await Product.create({
                name: p.name,
                slug: computedSlug,
                description: p.description,
                price: p.price,
                originalPrice: p.originalPrice ?? null,
                images: p.images,
                category: categoryId,
                specifications: p.specifications,
                stock: p.stockBase + rand(-10, 20),
                sold: p.soldBase + rand(0, 50),
                views: rand(p.soldBase * 3, p.soldBase * 8),
                averageRating: randFloat(3.8, 5.0),
                reviewCount: rand(Math.floor(p.soldBase * 0.1), Math.floor(p.soldBase * 0.3)),
            });
            console.log(`✅ Created: ${p.name}`);
            created++;
        }
    }

    console.log(`\n🎉 Done! ${created} products created, ${skipped} skipped.`);
    await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
