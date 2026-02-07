import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    slug: { type: String, unique: true }, // URL thân thiện (SEO)
    description: { type: String, required: true },
    price: { type: Number, required: true },
    originalPrice: { type: Number },
    
    images: [{ type: String }],
    
    category: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Category', 
        required: true 
    },
    
    // Thông số kỹ thuật (Dành cho Pet shop)
    // VD: { "weight": "2kg", "age": "kitten", "origin": "UK" }
    specifications: {
        type: Map,
        of: String 
    },

    stock: { type: Number, required: true, default: 0 },
    sold: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    
    // Hai trường này mình giữ lại để query nhanh, không cần tính toán lại mỗi lần
    averageRating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 }

}, { 
    timestamps: true,
    // CẤU HÌNH QUAN TRỌNG ĐỂ VIRTUALS HOẠT ĐỘNG
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// --- 1. MIDDLEWARE TẠO SLUG TỰ ĐỘNG (HỖ TRỢ TIẾNG VIỆT) ---
productSchema.pre('save', function(next) {
    if (this.isModified('name')) {
        // Chuyển tiếng Việt có dấu thành không dấu
        // VD: "Thức ăn cho Mèo" -> "thuc-an-cho-meo"
        this.slug = this.name
            .toLowerCase()
            .normalize("NFD") // Tách dấu ra khỏi ký tự
            .replace(/[\u0300-\u036f]/g, "") // Xóa các dấu
            .replace(/[đĐ]/g, 'd') // Xử lý chữ đ/Đ
            .replace(/[^a-z0-9 ]/g, '') // Chỉ giữ lại chữ, số và khoảng trắng
            .trim()
            .replace(/\s+/g, '-'); // Thay khoảng trắng bằng dấu gạch ngang
    }
    next();
});

// --- 2. VIRTUAL POPULATE REVIEWS ---
// Giúp bạn lấy được danh sách review khi query Product mà không cần lưu mảng review ID trong Product
// Cách dùng ở Controller: await Product.findById(id).populate('reviews');
productSchema.virtual('reviews', {
    ref: 'Review',          // Tên Model Review
    localField: '_id',      // Trường bên Product để liên kết
    foreignField: 'product' // Trường bên Review lưu ID của Product
});

// --- 3. INDEXES (TỐI ƯU TỐC ĐỘ TÌM KIẾM) ---
// Tạo index cho tính năng tìm kiếm Full-text search
productSchema.index({ name: 'text', description: 'text' });

// Tạo index cho tính năng Lọc & Sắp xếp (Filter & Sort)
// Giúp query tìm sản phẩm theo danh mục và giá cực nhanh
productSchema.index({ category: 1, price: 1 });

// Tạo index cho tính năng bán chạy (Sold)
productSchema.index({ sold: -1 });

export default mongoose.model("Product", productSchema);