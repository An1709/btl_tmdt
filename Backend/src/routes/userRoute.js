import express from 'express';
import {
    getUserProfile,
    updateUserProfile,
    updateUserAvatar,
    changeOwnPassword,
    getAllUsers,
    createUser,
    updateUser,
    blockUser,
    unblockUser,
    deleteUser,
    test,
} from '../controllers/userController.js';
import { protectedRoute, adminRoute } from '../middlewares/authMiddleware.js';
import upload from '../middlewares/uploadMiddleware.js';

const router = express.Router();

router.route('/profile')
    .get(protectedRoute, getUserProfile)
    .put(protectedRoute, updateUserProfile);

const uploadAvatar = (req, res, next) => {
    upload.single('avatar')(req, res, (error) => {
        if (!error) return next();

        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'Ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn 5MB.' });
        }

        return res.status(400).json({ message: 'Vui lòng chọn tệp ảnh hợp lệ.' });
    });
};

router.put('/me/avatar', protectedRoute, uploadAvatar, updateUserAvatar);
router.put('/me/password', protectedRoute, changeOwnPassword);

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
