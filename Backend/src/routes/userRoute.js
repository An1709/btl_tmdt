import express from 'express';
import { 
    getUserProfile, 
    updateUserProfile, 
    getAllUsers, 
    deleteUser,
    test
} from '../controllers/userController.js'; // Bạn nhớ tạo file userController nhé
import { protectedRoute, adminRoute } from '../middlewares/authMiddleware.js';

const router = express.Router();

// User Routes
router.route('/profile')
    .get(protectedRoute, getUserProfile)
    .put(protectedRoute, updateUserProfile);

// Admin Routes
router.route('/')
    .get(protectedRoute, adminRoute, getAllUsers);

router.route('/:id')
    .delete(protectedRoute, adminRoute, deleteUser);

router.get('/test', test);

export default router;