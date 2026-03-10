import express from 'express';
import { getPosts, getPostBySlug, createPost, deletePost } from '../controllers/postController.js';
import { protectedRoute, adminRoute } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/', getPosts);
router.get('/:slug', getPostBySlug);

// Protected routes (admin only)
router.post('/', protectedRoute, adminRoute, createPost);
router.delete('/:id', protectedRoute, adminRoute, deletePost);

export default router;