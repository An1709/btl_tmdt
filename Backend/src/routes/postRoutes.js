import express from 'express';
/* Lưu ý: Bạn cần tạo file postController.js chứa các hàm này 
   hoặc comment lại nếu chưa viết xong controller 
*/
// import { getPosts, createPost } from '../controllers/postController.js';
import { protectedRoute } from '../middlewares/authMiddleware.js';

const router = express.Router();

// router.route('/').get(getPosts);
// router.route('/').post(protectedRoute, createPost);

export default router;