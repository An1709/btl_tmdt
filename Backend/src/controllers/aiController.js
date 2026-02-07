import OpenAI from 'openai';
import Product from '../models/Product.js';

// Khởi tạo OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// @desc    Chat với Bot
// @route   POST /api/ai/chat
export const chatWithAI = async (req, res) => {
    const { message } = req.body;

    try {
        // (Optional) Lấy 5 sản phẩm mới nhất để làm context cho AI
        const products = await Product.find().limit(5).select('name price');
        const productContext = products.map(p => `${p.name} giá ${p.price}đ`).join(', ');

        const systemPrompt = `Bạn là trợ lý ảo của PetShop. Hãy tư vấn thân thiện. Cửa hàng đang có các sản phẩm: ${productContext}.`;

        const completion = await openai.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: message }
            ],
            model: "gpt-3.5-turbo",
        });

        res.json({ reply: completion.choices[0].message.content });
    } catch (error) {
        console.error("OpenAI Error:", error);
        res.status(500).json({ message: "AI đang bận, vui lòng thử lại sau" });
    }
};