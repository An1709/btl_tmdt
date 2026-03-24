// seedCategories.mjs  — run with: node seedCategories.mjs
// Reseeds pet-shop categories with slugs that match the frontend filter (dog, cat, rabbit…).
// ⚠️  Drops all existing categories and products first for a clean slate.
import 'dotenv/config';
import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
    {
        name: { type: String, required: true, unique: true },
        slug: { type: String, required: true, unique: true },
        image: { type: String },
        description: { type: String },
    },
    { timestamps: true },
);
const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);

// Also clear products so stale category ObjectId refs don't linger
const productSchema = new mongoose.Schema({ name: String }, { strict: false });
const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

// ── Category data — slugs MUST match petCategories ids in @/types/product ──
const categories = [
    {
        name: 'Chó',
        slug: 'dog',
        image: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=600&h=400&fit=crop',
        description: 'Thú cưng, thức ăn, phụ kiện và sản phẩm chăm sóc toàn diện dành cho chó mọi giống và lứa tuổi.',
    },
    {
        name: 'Mèo',
        slug: 'cat',
        image: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&h=400&fit=crop',
        description: 'Thức ăn, đồ chơi, nhà cào móng và phụ kiện cao cấp dành cho mèo cưng của bạn.',
    },
    {
        name: 'Thỏ',
        slug: 'rabbit',
        image: 'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=600&h=400&fit=crop',
        description: 'Thức ăn, chuồng và phụ kiện chuyên dụng cho thỏ cảnh.',
    },
    {
        name: 'Hamster',
        slug: 'hamster',
        image: 'https://images.unsplash.com/photo-1425082661705-1834bfd09dca?w=600&h=400&fit=crop',
        description: 'Lồng nuôi, thức ăn, bánh xe chạy và phụ kiện đặc thù cho hamster.',
    },
    {
        name: 'Vẹt',
        slug: 'parrot',
        image: 'https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=600&h=400&fit=crop',
        description: 'Lồng chim, thức ăn, đồ chơi trí tuệ và phụ kiện dành cho vẹt và các loài chim cảnh.',
    },
    {
        name: 'Cá',
        slug: 'fish',
        image: 'https://images.unsplash.com/photo-1535591273668-578e31182c4f?w=600&h=400&fit=crop',
        description: 'Bể cá, máy lọc, đèn, thức ăn cá và thiết bị thuỷ sinh chất lượng cao.',
    },
    {
        name: 'Phụ Kiện',
        slug: 'accessory',
        image: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=600&h=400&fit=crop',
        description: 'Vòng cổ, dây dắt, quần áo, balo vận chuyển và phụ kiện đa năng cho mọi thú cưng.',
    },
];

async function main() {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log('✅ Connected to MongoDB');

    // Wipe existing categories & products for a clean slate
    await Product.deleteMany({});
    console.log('🗑️  Cleared all products.');
    await Category.deleteMany({});
    console.log('🗑️  Cleared all categories.');

    let created = 0;
    for (const c of categories) {
        await Category.create(c);
        console.log(`✅ Created: ${c.name} (slug: ${c.slug})`);
        created++;
    }

    console.log(`\n🎉 Done! ${created} categories created.`);
    await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
