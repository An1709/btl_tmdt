import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

// Kiểm tra xem có API Key chưa
if (!process.env.OPENAI_API_KEY) {
    console.warn("⚠️ Cảnh báo: Chưa có OPENAI_API_KEY trong file .env. Tính năng Chat AI sẽ không hoạt động.");
}

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, 
});

export default openai;