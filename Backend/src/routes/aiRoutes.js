import express from 'express';
import { chatWithAI } from '../controllers/aiController.js';
// import { getRecommendations } from '../controllers/aiController.js';
import { protectedRoute } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/chat', chatWithAI);

// router.get('/recommendations', protectedRoute, getRecommendations);

export default router;