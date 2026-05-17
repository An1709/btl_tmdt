import Collection from '../models/Collection.js';
import Product from '../models/Product.js';
import mongoose from 'mongoose';

// @desc    Lấy danh sách yêu thích của User
// @route   GET /api/collection
export const getCollection = async (req, res) => {
    try {
        // Tìm collection của user và populate (lấy chi tiết) thông tin sản phẩm
        const collection = await Collection.findOne({ user: req.user._id })
            .populate('products', 'name price images stock slug description averageRating reviewCount category specifications sold originalPrice');

        if (!collection) {
            // Nếu chưa có thì trả về mảng rỗng
            return res.json({ products: [] });
        }

        res.json(collection);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Thêm sản phẩm vào yêu thích
// @route   POST /api/collection
export const addToCollection = async (req, res) => {
    const { productId } = req.body;

    try {
        if (!mongoose.isValidObjectId(productId)) {
            return res.status(400).json({ message: 'Mã sản phẩm không hợp lệ.' });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
        }

        let collection = await Collection.findOne({ user: req.user._id });

        if (!collection) {
            // Nếu chưa có collection thì tạo mới
            collection = await Collection.create({
                user: req.user._id,
                products: [productId]
            });
        } else {
            // Nếu đã có, kiểm tra xem sản phẩm đã tồn tại chưa
            if (collection.products.some((id) => id.toString() === productId)) {
                return res.status(400).json({ message: 'Sản phẩm đã có trong danh sách yêu thích' });
            }
            collection.products.push(productId);
            await collection.save();
        }

        await collection.populate('products', 'name price images stock slug description averageRating reviewCount category specifications sold originalPrice');
        res.status(200).json({ message: 'Đã thêm vào yêu thích', products: collection.products });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Xóa sản phẩm khỏi yêu thích
// @route   DELETE /api/collection/:productId
export const removeFromCollection = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.productId)) {
            return res.status(400).json({ message: 'Mã sản phẩm không hợp lệ.' });
        }

        const product = await Product.findById(req.params.productId);
        if (!product) {
            return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
        }

        const collection = await Collection.findOne({ user: req.user._id });

        if (collection) {
            // Lọc bỏ productId ra khỏi mảng
            collection.products = collection.products.filter(
                (pid) => pid.toString() !== req.params.productId
            );
            await collection.save();
            res.json({ message: 'Đã xóa khỏi yêu thích' });
        } else {
            res.status(404).json({ message: 'Không tìm thấy danh sách yêu thích' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
