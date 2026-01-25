import express from 'express';
import dotenv from 'dotenv';
import connectDB from './libs/db.js';
import authRoute from './routes/authRoute.js';
import UserRoute from './routes/userRoute.js';
import { protectedRoute } from './middlewares/authMiddleware.js';
import cors from 'cors';   
import cookieParser from 'cookie-parser';

dotenv.config();  

const app = express();
connectDB();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({origin: process.env.CLIENT_URL, credentials: true})); 

// public routes
app.use('/api/auth', authRoute);

//private routes
app.use(protectedRoute); 
app.use('/api/users', UserRoute);

//Connect to MongoDB
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}).catch((error) => {
    console.error('Failed to connect to the database:', error);
});   

