import express from 'express';
import { getDashboardStats } from '../controllers/adminDashboardController.js';
import { protectedRoute, adminRoute } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/dashboard/stats', protectedRoute, adminRoute, getDashboardStats);

export default router;
