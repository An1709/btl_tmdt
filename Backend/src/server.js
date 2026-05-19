import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import connectDB from './config/db.js';

// Import các Routes
import authRoutes from './routes/authRoute.js';
import userRoutes from './routes/userRoute.js';
import productRoutes from './routes/productRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import collectionRoutes from './routes/collectionRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import couponRoutes from './routes/couponRoutes.js';
import postRoutes from './routes/postRoutes.js';
import warrantyRoutes from './routes/warrantyRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import newsletterRoutes from './routes/newsletterRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import petVisionRoutes from './routes/petVisionRoutes.js';
import adminPetVisionRoutes from './routes/adminPetVisionRoutes.js';


// Cấu hình
dotenv.config();
const PORT = process.env.PORT || 5001;

const app = express();

// --- Middlewares ---
// 1. Xử lý CORS (Cho phép Frontend gọi API)
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
}));

// 2. Xử lý JSON body
app.use(express.json());

// 3. Xử lý URL Encoded (Quan trọng cho VNPAY trả dữ liệu về)
app.use(express.urlencoded({ extended: true }));

// 4. Xử lý Cookies
app.use(cookieParser());
app.use('/uploads', express.static(path.resolve('uploads')));

// --- Routes Definition ---

// Auth & Users
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// E-commerce Core
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/coupons', couponRoutes);


// Features & Content
app.use('/api/ai', aiRoutes);
app.use('/api/chatbot', aiRoutes);
app.use('/api/collection', collectionRoutes); // Yêu thích
app.use('/api/collections', collectionRoutes); // Frontend alias for wishlist
app.use('/api/posts', postRoutes);            // Blog & Forum
app.use('/api/warranty', warrantyRoutes);     // Bảo hành
app.use('/api/reviews', reviewRoutes);        // Đánh giá
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/pet-vision', petVisionRoutes);
app.use('/api/admin/pet-vision', adminPetVisionRoutes);

// Default Route (Kiểm tra server sống hay chết)
app.get('/', (req, res) => {
    res.send('PetShop API is running...');
});

// --- Global Error Handler (Bắt lỗi toàn app để không crash server) ---
app.use((err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode);
    res.json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
});

// --- Connect DB & Start Server ---
// Chỉ gọi connectDB một lần duy nhất
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Server is running on port ${PORT}`);
        console.log(`🔗 Frontend allowed: ${process.env.CLIENT_URL}`);
    });
}).catch((error) => {
    console.error('❌ Failed to connect to the database:', error);
    process.exit(1); // Thoát nếu không kết nối được DB
});
