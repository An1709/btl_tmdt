import Order from '../models/Order.js';

/*
  Middleware kiểm tra quyền đánh giá (Review Guard)
  Logic: User chỉ được review khi đã mua sản phẩm đó và đơn hàng đã hoàn thành.
*/
export const canReview = async (req, res, next) => {
    try {
        const userId = req.user._id; // Lấy từ authMiddleware
        
        // Lấy productId từ body (khi post review) hoặc params (khi check quyền)
        const productId = req.body.productId || req.params.productId; 

        if (!productId) {
            return res.status(400).json({ message: 'Thiếu thông tin sản phẩm (productId)' });
        }

        // Tìm trong DB xem có đơn hàng nào thỏa mãn 3 điều kiện:
        // 1. Của user này
        // 2. Chứa sản phẩm này
        // 3. Trạng thái là Đã giao (Delivered) hoặc Đã hoàn thành (Completed)
        const hasPurchased = await Order.findOne({
            user: userId,
            'orderItems.product': productId, // Query vào mảng con (nested array)
            status: { $in: ['Delivered', 'Completed'] } 
        });

        if (hasPurchased) {
            next(); // Hợp lệ -> Cho qua
        } else {
            res.status(403).json({ 
                message: 'Bạn chưa mua sản phẩm này hoặc đơn hàng chưa giao thành công, nên không thể đánh giá.' 
            });
        }
    } catch (error) {
        console.error("Lỗi tại reviewMiddleware:", error);
        res.status(500).json({ message: 'Lỗi server khi kiểm tra quyền đánh giá' });
    }
};