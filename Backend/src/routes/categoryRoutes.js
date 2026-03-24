import express from 'express';
import Category from '../models/Category.js';

const router = express.Router();

// GET /api/categories  — public, returns all categories
router.get('/', async (req, res) => {
    try {
        const categories = await Category.find({}).sort({ name: 1 });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/categories/:slug
router.get('/:slug', async (req, res) => {
    try {
        const category = await Category.findOne({ slug: req.params.slug });
        if (!category) return res.status(404).json({ message: 'Không tìm thấy danh mục' });
        res.json(category);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
