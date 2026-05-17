import express from 'express';
import {
    getPosts,
    getPostBySlug,
    createPost,
    updatePost,
    deletePost,
    upsertPostComment,
    deletePostComment,
} from '../controllers/postController.js';
import { protectedRoute, adminRoute } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/', getPosts);
router.get('/:slug', getPostBySlug);

// Blog comments/ratings
router.post('/:id/comments', protectedRoute, upsertPostComment);
router.delete('/:id/comments/:commentId', protectedRoute, deletePostComment);

// Protected routes (admin only)
router.post('/', protectedRoute, adminRoute, createPost);
router.put('/:id', protectedRoute, adminRoute, updatePost);
router.delete('/:id', protectedRoute, adminRoute, deletePost);

export default router;
