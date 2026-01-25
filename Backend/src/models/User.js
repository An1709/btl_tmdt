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
    },
    avatarId: {
        type: String,
    },
    bio: {
        type: String,
        maxlength: 160,
    },
    phone: {
        type: String,
        sparse: true, //cho phép giá trị null cho trường này
    },
    
}, {
    timestamps: true,
});

export default mongoose.model("User", userSchema);