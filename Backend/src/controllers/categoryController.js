import Category from '../models/Category.js';

// @desc    Lấy tất cả danh mục
// @route   GET /api/categories
export const getCategories = async (req, res) => {
    try {
        const categories = await Category.find({});
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Tạo danh mục mới (Admin)
// @route   POST /api/categories
export const createCategory = async (req, res) => {
    try {
        const { name, slug, description, image } = req.body;

        const categoryExists = await Category.findOne({ name });
        if (categoryExists) {
            return res.status(400).json({ message: 'Danh mục này đã tồn tại' });
        }

        const category = await Category.create({
            name,
            slug: slug || name.toLowerCase().replace(/ /g, '-'), // Tự tạo slug nếu không gửi lên
            description,
            image
        });

        res.status(201).json(category);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Xóa danh mục (Admin)
// @route   DELETE /api/categories/:id
export const deleteCategory = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);

        if (category) {
            await category.deleteOne();
            res.json({ message: 'Đã xóa danh mục' });
        } else {
            res.status(404).json({ message: 'Không tìm thấy danh mục' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};