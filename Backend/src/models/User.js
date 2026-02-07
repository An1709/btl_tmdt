import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    // Giữ tên là hashedPassword để khớp với code controller của bạn
    hashedPassword: { 
        type: String,
        required: true
    },
    displayName: {
        type: String,
        required: true, 
        trim: true
    },
    avatarUrl: {
        type: String,
        default: 'https://res.cloudinary.com/dtiq872/image/upload/v1/default-avatar.png'
    },
    avatarId: {
        type: String,
    },
    bio: {
        type: String,
        maxlength: 160,
    },
    
    // Vẫn cần thêm các trường này cho E-commerce
    role: {
        type: String,
        enum: ['customer', 'admin', 'staff'],
        default: 'customer'
    },
    phone: {
        type: String,
        sparse: true, 
    },
    address: { 
        type: String, 
    },
    isBlocked: { 
        type: Boolean, 
        default: false 
    },
    
}, {
    timestamps: true,
});

export default mongoose.model("User", userSchema);