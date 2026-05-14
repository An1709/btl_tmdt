import mongoose from "mongoose";

const verificationCodeSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        index: true,
    },
    purpose: {
        type: String,
        enum: ['email_verification', 'password_reset'],
        required: true,
        index: true,
    },
    codeHash: {
        type: String,
        required: true,
    },
    expiresAt: {
        type: Date,
        required: true,
        index: true,
    },
    attempts: {
        type: Number,
        default: 0,
    },
    consumedAt: {
        type: Date,
        default: null,
    },
}, {
    timestamps: true,
});

verificationCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('VerificationCode', verificationCodeSchema);
