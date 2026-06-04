import express from 'express';
import 'dotenv/config';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import connectDB from './config/db.js';

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
import {
    logPetVisionPythonDiagnosticsOnce,
    logPetVisionRuntimeDiagnosticsOnce,
    startInferenceServer,
} from './services/petVisionRuntime.js';

const PORT = process.env.PORT || 5001;

const app = express();
app.set('trust proxy', 1);

const parseAllowedOrigins = () => {
    const origins = new Set(['http://localhost:5173']);

    if (process.env.CLIENT_URL) {
        process.env.CLIENT_URL
            .split(',')
            .map((origin) => origin.trim())
            .filter(Boolean)
            .forEach((origin) => origins.add(origin));
    }

    return origins;
};

const allowedOrigins = parseAllowedOrigins();

app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin)) {
            callback(null, true);
            return;
        }

        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/uploads', express.static(path.resolve('uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/chatbot', aiRoutes);
app.use('/api/collection', collectionRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/warranty', warrantyRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/pet-vision', petVisionRoutes);
app.use('/api/admin/pet-vision', adminPetVisionRoutes);

app.get('/', (req, res) => {
    res.send('PetShop API is running...');
});

app.use((err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode);
    res.json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
});

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
        console.log(`Frontend allowed: ${Array.from(allowedOrigins).join(', ')}`);
        logPetVisionRuntimeDiagnosticsOnce();
        logPetVisionPythonDiagnosticsOnce().catch((error) => {
            console.error('[PetVision:python] Diagnostics failed:', error?.message || error);
        });
        // Start the Python inference server in the background so the model is
        // loaded once and kept in memory for all prediction requests.
        startInferenceServer().catch((error) => {
            console.warn(
                '[PetVision:server] Inference server did not start (will fall back to subprocess mode):',
                error?.message || error,
            );
        });
    });
}).catch((error) => {
    console.error('Failed to connect to the database:', error);
    process.exit(1);
});
