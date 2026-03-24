// seedCoupons.mjs  — run with: node seedCoupons.mjs
// Inserts realistic discount coupons into MongoDB.
// Reads MONGODB_URL from .env via dotenv.
import 'dotenv/config';
import mongoose from 'mongoose';

// ── Coupon schema (inline, avoids ESM/CJS issues with the app) ───────────────
const couponSchema = new mongoose.Schema(
    {
        code: { type: String, required: true, unique: true, uppercase: true },
        discountType: { type: String, enum: ['percent', 'fixed'], default: 'percent' },
        value: { type: Number, required: true },
        minOrderValue: { type: Number, default: 0 },
        expirationDate: { type: Date, required: true },
        usageLimit: { type: Number, default: 100 },
        usedCount: { type: Number, default: 0 },
    },
    { timestamps: true },
);
const Coupon = mongoose.models.Coupon || mongoose.model('Coupon', couponSchema);

// ── helper: relative date from now ────────────────────────────────────────
const daysFromNow = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d;
};

// ── coupon data ────────────────────────────────────────────────────────────
const coupons = [
    // ── Seasonal / Welcome ──────────────────────────────────────────────────
    {
        code: 'WELCOME10',
        discountType: 'percent',
        value: 10,
        minOrderValue: 0,
        expirationDate: daysFromNow(365),
        usageLimit: 9999,
        usedCount: 847,
    },
    {
        code: 'NEWPET15',
        discountType: 'percent',
        value: 15,
        minOrderValue: 200_000,
        expirationDate: daysFromNow(180),
        usageLimit: 500,
        usedCount: 132,
    },
    // ── Flash Sales ─────────────────────────────────────────────────────────
    {
        code: 'FLASH20',
        discountType: 'percent',
        value: 20,
        minOrderValue: 500_000,
        expirationDate: daysFromNow(7),
        usageLimit: 200,
        usedCount: 88,
    },
    {
        code: 'SUMMER25',
        discountType: 'percent',
        value: 25,
        minOrderValue: 800_000,
        expirationDate: daysFromNow(30),
        usageLimit: 300,
        usedCount: 57,
    },
    // ── Fixed-amount VIP ────────────────────────────────────────────────────
    {
        code: 'SAVE50K',
        discountType: 'fixed',
        value: 50_000,
        minOrderValue: 300_000,
        expirationDate: daysFromNow(60),
        usageLimit: 1000,
        usedCount: 423,
    },
    {
        code: 'SAVE100K',
        discountType: 'fixed',
        value: 100_000,
        minOrderValue: 600_000,
        expirationDate: daysFromNow(90),
        usageLimit: 500,
        usedCount: 212,
    },
    {
        code: 'VIP200K',
        discountType: 'fixed',
        value: 200_000,
        minOrderValue: 1_500_000,
        expirationDate: daysFromNow(120),
        usageLimit: 100,
        usedCount: 18,
    },
    // ── Category-specific (tracked by name convention, enforced by controller) ─
    {
        code: 'PETFOOD10',
        discountType: 'percent',
        value: 10,
        minOrderValue: 250_000,
        expirationDate: daysFromNow(45),
        usageLimit: 800,
        usedCount: 310,
    },
    {
        code: 'HEALTH15',
        discountType: 'percent',
        value: 15,
        minOrderValue: 350_000,
        expirationDate: daysFromNow(60),
        usageLimit: 400,
        usedCount: 74,
    },
    // ── Birthday / Loyalty ──────────────────────────────────────────────────
    {
        code: 'BIRTHDAY30',
        discountType: 'percent',
        value: 30,
        minOrderValue: 400_000,
        expirationDate: daysFromNow(14),
        usageLimit: 50,
        usedCount: 9,
    },
    {
        code: 'LOYAL5',
        discountType: 'percent',
        value: 5,
        minOrderValue: 0,
        expirationDate: daysFromNow(999),
        usageLimit: 99999,
        usedCount: 2845,
    },
    // ── App-only ────────────────────────────────────────────────────────────
    {
        code: 'APP15',
        discountType: 'percent',
        value: 15,
        minOrderValue: 150_000,
        expirationDate: daysFromNow(180),
        usageLimit: 5000,
        usedCount: 1234,
    },
];

// ── main ───────────────────────────────────────────────────────────────────
async function main() {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log('✅ Connected to MongoDB');

    let created = 0;
    let skipped = 0;

    for (const c of coupons) {
        const exists = await Coupon.findOne({ code: c.code.toUpperCase() });
        if (exists) {
            console.log(`⏭  Skipped (already exists): ${c.code}`);
            skipped++;
            continue;
        }
        await Coupon.create(c);
        console.log(`✅ Created: ${c.code}  (${c.discountType === 'percent' ? c.value + '%' : c.value.toLocaleString('vi-VN') + '₫ off'})`);
        created++;
    }

    console.log(`\n🎉 Done! ${created} coupons created, ${skipped} skipped.`);
    await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
