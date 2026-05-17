import { generateChatbotReply, validateChatMessage } from '../services/chatbotService.js';

// @desc    Rule-based customer support chatbot
// @route   POST /api/chatbot/message
export const chatWithAI = async (req, res) => {
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    const validationError = validateChatMessage(message);

    if (validationError) {
        return res.status(400).json({
            success: false,
            message: validationError,
        });
    }

    try {
        const { status, body } = await generateChatbotReply({
            message,
            history: req.body?.history,
            conversationId: req.body?.conversationId || req.body?.sessionId,
            user: req.user,
        });

        return res.status(status).json(body);
    } catch (error) {
        console.error('Chatbot request failed:', error?.name || 'UnknownError');
        return res.status(503).json({
            success: false,
            message: 'PetBot đang bận. Vui lòng thử lại sau.',
        });
    }
};
