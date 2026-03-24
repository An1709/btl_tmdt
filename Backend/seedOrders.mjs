// seedOrders.mjs  — run with: node seedOrders.mjs
// Inserts realistic orders into MongoDB.
// Reads MONGODB_URL from .env via dotenv.
// IMPORTANT: Run seedCategories.mjs and seedProducts.mjs first.
import 'dotenv/config';
import mongoose from 'mongoose';

// ── Inline schemas (avoids ESM/CJS issues with the app) ─────────────────────
const UserSchema = new mongoose.Schema({ username: String, role: String, email: String, displayName: String, phone: String, address: String }, { strict: false });
const User = mongoose.models.User || mongoose.model('User', UserSchema);

const ProductSchema = new mongoose.Schema({ name: String, price: Number, images: [String], slug: String }, { strict: false });
const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

const orderSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        orderItems: [{
            product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
            name: { type: String },
            qty: { type: Number, required: true },
            price: { type: Number, required: true },
            image: { type: String },
        }],
        shippingAddress: {
            address: { type: String, required: true },
            city: { type: String, required: true },
            phone: { type: String, required: true },
        },
        paymentMethod: { type: String, required: true },
        paymentResult: {
            id: { type: String },
            status: { type: String },
            update_time: { type: String },
            email_address: { type: String },
        },
        itemsPrice: { type: Number, required: true },
        shippingPrice: { type: Number, required: true, default: 0 },
        discountAmount: { type: Number, default: 0 },
        totalPrice: { type: Number, required: true },
        isPaid: { type: Boolean, default: false },
        paidAt: { type: Date },
        isDelivered: { type: Boolean, default: false },
        deliveredAt: { type: Date },
        status: { type: String, enum: ['Pending', 'Processing', 'Shipping', 'Delivered', 'Cancelled'], default: 'Pending' },
        coupon: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' },
    },
    { timestamps: true },
);
const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);

// ── helpers ────────────────────────────────────────────────────────────────
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };

// ── realistic Vietnamese address bank ─────────────────────────────────────
const addressBank = [
    { address: '12 Nguyễn Huệ, Phường Bến Nghé, Quận 1', city: 'TP. Hồ Chí Minh', phone: '0901234567' },
    { address: '45 Lê Lợi, Phường Phạm Ngũ Lão, Quận 1', city: 'TP. Hồ Chí Minh', phone: '0912345678' },
    { address: '88 Trần Hưng Đạo, Phường Cô Giang, Quận 1', city: 'TP. Hồ Chí Minh', phone: '0923456789' },
    { address: '230 Điện Biên Phủ, Phường 15, Quận Bình Thạnh', city: 'TP. Hồ Chí Minh', phone: '0934567890' },
    { address: '56 Hoàng Diệu 2, Phường Linh Chiểu, TP. Thủ Đức', city: 'TP. Hồ Chí Minh', phone: '0945678901' },
    { address: '17 Trần Phú, Phường Văn Quán, Quận Hà Đông', city: 'Hà Nội', phone: '0356789012' },
    { address: '89 Phố Huế, Phường Ngô Thì Nhậm, Quận Hai Bà Trưng', city: 'Hà Nội', phone: '0367890123' },
    { address: '3 Lý Thái Tổ, Phường Lý Thái Tổ, Quận Hoàn Kiếm', city: 'Hà Nội', phone: '0378901234' },
    { address: '102 Lê Duẩn, Phường Thạch Thang, Quận Hải Châu', city: 'Đà Nẵng', phone: '0236901234' },
    { address: '74 Nguyễn Văn Linh, Phường Tân Thuận Tây, Quận 7', city: 'TP. Hồ Chí Minh', phone: '0956789012' },
];

// ── order scenario templates (status → isPaid/isDelivered logic) ──────────
const scenarioMap = {
    'Delivered': { isPaid: true, isDelivered: true },
    'Shipping': { isPaid: true, isDelivered: false },
    'Processing': { isPaid: true, isDelivered: false },
    'Pending': { isPaid: false, isDelivered: false },
    'Cancelled': { isPaid: false, isDelivered: false },
};

const statuses = ['Delivered', 'Delivered', 'Delivered', 'Shipping', 'Shipping', 'Processing', 'Pending', 'Cancelled'];
const paymentMethods = ['COD', 'COD', 'Banking', 'Banking', 'MoMo', 'ZaloPay'];

// ── main ───────────────────────────────────────────────────────────────────
async function main() {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log('✅ Connected to MongoDB');

    // ── 1. Load all customer users ────────────────────────────────────────
    const customers = await User.find({ role: { $in: ['customer', 'admin', 'staff'] } }).limit(50);
    if (customers.length === 0) {
        console.error('❌ No users found in DB. Register at least one user first, then re-run.');
        process.exit(1);
    }
    console.log(`👤 Found ${customers.length} user(s) to use as order owners.`);

    // ── 2. Load all products ──────────────────────────────────────────────
    const products = await Product.find({});
    if (products.length === 0) {
        console.error('❌ No products found. Run seedProducts.mjs first.');
        process.exit(1);
    }
    console.log(`🛒 Found ${products.length} product(s) in catalogue.`);

    // ── 3. Decide how many sample orders to create ────────────────────────
    const TARGET_ORDERS = 30; // adjust freely
    const existingCount = await Order.countDocuments({});
    if (existingCount >= TARGET_ORDERS) {
        console.log(`⏭  Already have ${existingCount} orders (≥ ${TARGET_ORDERS}). Nothing to insert.`);
        await mongoose.disconnect();
        return;
    }
    const toCreate = TARGET_ORDERS - existingCount;
    console.log(`📝 Will create ${toCreate} new order(s) (existing: ${existingCount}).\n`);

    let created = 0;

    for (let i = 0; i < toCreate; i++) {
        const customer = pick(customers);
        const shippingAddress = pick(addressBank);
        const paymentMethod = pick(paymentMethods);
        const status = pick(statuses);
        const { isPaid, isDelivered } = scenarioMap[status];

        // Pick 1–3 random products for this order
        const numItems = rand(1, Math.min(3, products.length));
        const shuffled = [...products].sort(() => Math.random() - 0.5);
        const selectedProducts = shuffled.slice(0, numItems);

        const orderItems = selectedProducts.map((p) => ({
            product: p._id,
            name: p.name,
            qty: rand(1, 3),
            price: p.price,
            image: p.images?.[0] ?? '',
        }));

        const itemsPrice = orderItems.reduce((sum, item) => sum + item.price * item.qty, 0);
        const shippingPrice = itemsPrice >= 500_000 ? 0 : 30_000;  // free shipping over 500k
        const discountAmount = pick([0, 0, 0, 50_000, 100_000]);   // 70% chance no discount
        const totalPrice = Math.max(0, itemsPrice + shippingPrice - discountAmount);

        // Timestamps: orders spread over last 90 days
        const daysOld = rand(0, 89);
        const createdAt = daysAgo(daysOld);

        const paidAt = isPaid
            ? new Date(createdAt.getTime() + rand(5, 60) * 60_000) // paid 5–60 mins after order
            : undefined;
        const deliveredAt = isDelivered
            ? new Date(createdAt.getTime() + rand(2, 7) * 24 * 60 * 60_000) // delivered 2–7 days later
            : undefined;

        const paymentResult = isPaid && paymentMethod !== 'COD'
            ? {
                id: `PAY-${Date.now()}-${rand(1000, 9999)}`,
                status: 'COMPLETED',
                update_time: paidAt.toISOString(),
                email_address: customer.email ?? 'n/a',
            }
            : undefined;

        await Order.create({
            user: customer._id,
            orderItems,
            shippingAddress,
            paymentMethod,
            paymentResult,
            itemsPrice,
            shippingPrice,
            discountAmount,
            totalPrice,
            isPaid,
            paidAt,
            isDelivered,
            deliveredAt,
            status,
            createdAt,
            updatedAt: deliveredAt ?? paidAt ?? createdAt,
        });

        const label = `${customer.username ?? customer.email} | ${status} | ${totalPrice.toLocaleString('vi-VN')}₫`;
        console.log(`✅ Created order #${existingCount + created + 1}: ${label}`);
        created++;
    }

    console.log(`\n🎉 Done! ${created} orders created.`);
    await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
