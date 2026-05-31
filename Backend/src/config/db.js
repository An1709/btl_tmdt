import mongoose from 'mongoose';

const connectDB = async () => {
    try {
        const mongoUrl = process.env.MONGODB_URI || process.env.MONGODB_URL;
        if (!mongoUrl) {
            throw new Error('Missing MongoDB connection string. Set MONGODB_URI or MONGODB_URL.');
        }

        await mongoose.connect(mongoUrl);
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('MongoDB connection failed:', error.message);
        process.exit(1);
    }
};

export default connectDB;
