import mongoose from "mongoose";

const newsletterSubscriptionSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
    },
    couponCode: {
        type: String,
        required: true,
        uppercase: true,
        trim: true,
    },
    sentAt: {
        type: Date,
    },
}, { timestamps: true });

newsletterSubscriptionSchema.index({ email: 1, couponCode: 1 }, { unique: true });

export default mongoose.model("NewsletterSubscription", newsletterSubscriptionSchema);
