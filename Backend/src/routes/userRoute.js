import express from 'express';
import {
    getUserProfile,
    updateUserProfile,
    getAllUsers,
    createUser,
    updateUser,
    blockUser,
    unblockUser,
    deleteUser,
    test,
} from '../controllers/userController.js';
import { protectedRoute, adminRoute } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.route('/profile')
    .get(protectedRoute, getUserProfile)
    .put(protectedRoute, updateUserProfile);

router.route('/')
    .get(protectedRoute, adminRoute, getAllUsers)
    .post(protectedRoute, adminRoute, createUser);

router.put('/:id/block', protectedRoute, adminRoute, blockUser);
router.put('/:id/unblock', protectedRoute, adminRoute, unblockUser);

router.route('/:id')
    .put(protectedRoute, adminRoute, updateUser)
    .delete(protectedRoute, adminRoute, deleteUser);

router.get('/test', test);

export default router;
