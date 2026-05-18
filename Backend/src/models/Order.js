import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    orderItems: [{
        product: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'Product', 
            required: true 
        },
        name: { type: String },
        qty: { type: Number, required: true },
        price: { type: Number, required: true },
        image: { type: String }
    }],
    shippingAddress: {
        address: { type: String, required: true },
        city: { type: String, required: true },
        phone: { type: String, required: true }
    },
    paymentMethod: { type: String, required: true },
    paymentResult: {
        id: { type: String },
        status: { type: String },
        update_time: { type: String },
        email_address: { type: String }
    },
    itemsPrice: { type: Number, required: true },
    shippingPrice: { type: Number, required: true, default: 0 },
    discountAmount: { type: Number, default: 0 },
    totalPrice: { type: Number, required: true },
    isPaid: { type: Boolean, default: false },
    paidAt: { type: Date },
    isDelivered: { type: Boolean, default: false },
    deliveredAt: { type: Date },
    loyaltyPointsAwarded: {
        type: Boolean,
        default: false
    },
    loyaltyPoints: {
        type: Number,
        default: 0,
        min: 0
    },
    loyaltyAwardedAt: {
        type: Date
    },
    status: { 
        type: String, 
        enum: ['Pending', 'Processing', 'Shipping', 'Delivered', 'Cancelled'],
        default: 'Pending'
    },
    cancelRequested: {
        type: Boolean,
        default: false
    },
    cancelReason: {
        type: String,
        trim: true,
        maxlength: 500
    },
    cancelRequestedAt: {
        type: Date
    },
    cancelStatus: {
        type: String,
        enum: ['none', 'pending', 'approved', 'rejected'],
        default: 'none'
    },
    cancelResolvedAt: {
        type: Date
    },
    cancelRejectionReason: {
        type: String,
        trim: true,
        maxlength: 500
    },
    statusHistory: [{
        status: {
            type: String,
            required: true,
            trim: true
        },
        note: {
            type: String,
            trim: true,
            maxlength: 500
        },
        updatedAt: {
            type: Date,
            default: Date.now
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        updatedByRole: {
            type: String,
            trim: true
        }
    }],
    coupon: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' }

}, { timestamps: true });

export default mongoose.model("Order", orderSchema);
