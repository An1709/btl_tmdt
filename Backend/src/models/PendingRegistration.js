import mongoose from "mongoose";

const pendingRegistrationSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        index: true,
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        index: true,
    },
    hashedPassword: {
        type: String,
        required: true,
    },
    displayName: {
        type: String,
        required: true,
        trim: true,
    },
    codeHash: {
        type: String,
        required: true,
    },
    expiresAt: {
        type: Date,
        required: true,
    },
    attempts: {
        type: Number,
        default: 0,
    },
}, {
    timestamps: true,
});

pendingRegistrationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
pendingRegistrationSchema.index({ email: 1, username: 1 });

export default mongoose.model("PendingRegistration", pendingRegistrationSchema);
