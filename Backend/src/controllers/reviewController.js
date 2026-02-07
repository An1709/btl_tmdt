import Review from '../models/Review.js';
import Product from '../models/Product.js';

// @desc    Lấy tất cả đánh giá (Admin - Để kiểm duyệt)
// @route   GET /api/reviews
export const getAllReviews = async (req, res) => {
    try {
        // Populate để biết ai viết và viết cho sản phẩm nào
        const reviews = await Review.find({})
            .populate('user', 'fullName email')
            .populate('product', 'name')
            .sort({ createdAt: -1 }); // Mới nhất lên đầu
            
        res.json(reviews);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Xóa đánh giá (Admin - Xóa spam/tục tĩu)
// @route   DELETE /api/reviews/:id
export const deleteReview = async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);

        if (!review) {
            return res.status(404).json({ message: 'Không tìm thấy đánh giá' });
        }

        // 1. Tìm sản phẩm để cập nhật lại rating trung bình
        const product = await Product.findById(review.product);
        if (product) {
            // Logic tính lại rating sau khi xóa review
            // (Total cũ - rating review này) / (số lượng cũ - 1)
            const oldTotalScore = product.averageRating * product.reviewCount;
            const newCount = product.reviewCount - 1;

            if (newCount > 0) {
                product.averageRating = (oldTotalScore - review.rating) / newCount;
                product.reviewCount = newCount;
            } else {
                product.averageRating = 0;
                product.reviewCount = 0;
            }
            await product.save();
        }

        // 2. Xóa review khỏi DB
        await review.deleteOne();
        res.json({ message: 'Đã xóa đánh giá vi phạm' });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};