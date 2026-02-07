import mongoose from "mongoose";

const couponSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true, uppercase: true },
    discountType: { 
        type: String, 
        enum: ['percent', 'fixed'], 
        default: 'percent' 
    }, 
    value: { type: Number, required: true },
    minOrderValue: { type: Number, default: 0 },
    expirationDate: { type: Date, required: true },
    usageLimit: { type: Number, default: 100 },
    usedCount: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model("Coupon", couponSchema);