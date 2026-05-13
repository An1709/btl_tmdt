import Product from '../models/Product.js';
import Review from '../models/Review.js';
import APIFeatures from '../utils/apiFeatures.js';

const recalculateProductRating = async (product) => {
    const reviews = await Review.find({ product: product._id });
    product.reviewCount = reviews.length;
    product.averageRating = reviews.length
        ? reviews.reduce((acc, item) => item.rating + acc, 0) / reviews.length
        : 0;
    await product.save({ validateBeforeSave: false });
};

const normalizeImages = (images) => {
    if (Array.isArray(images)) {
        return images.map((image) => String(image).trim()).filter(Boolean);
    }

    if (typeof images === 'string') {
        return images.split(',').map((image) => image.trim()).filter(Boolean);
    }

    return [];
};

const normalizeSpecifications = (specifications) => {
    if (!specifications) return undefined;
    if (typeof specifications === 'object') return specifications;

    try {
        return JSON.parse(specifications);
    } catch {
        return undefined;
    }
};

const validateProductPayload = ({ name, price, description, category, stock }) => {
    if (!name || !description || !category) {
        return 'Name, description and category are required';
    }

    const numericPrice = Number(price);
    const numericStock = Number(stock);

    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
        return 'Product price is invalid';
    }

    if (!Number.isInteger(numericStock) || numericStock < 0) {
        return 'Product stock must be a non-negative integer';
    }

    return null;
};

export const getProducts = async (req, res) => {
    try {
        const features = new APIFeatures(Product.find(), req.query)
            .search()
            .filter()
            .sort()
            .limitFields()
            .pagination();

        const products = await features.query;
        const totalProducts = await Product.countDocuments(features.query.getFilter());

        res.json({
            products,
            page: Number(req.query.page) || 1,
            pages: Math.ceil(totalProducts / (Number(req.query.limit) || 10)),
            total: totalProducts
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('category', 'name slug')
            .populate({
                path: 'reviews',
                options: { sort: { createdAt: -1 } },
                populate: { path: 'user', select: 'displayName username avatarUrl' },
            });

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        product.views = (product.views || 0) + 1;
        product.save({ validateBeforeSave: false }).catch(() => {});

        res.json(product);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createProductReview = async (req, res) => {
    const { rating, comment } = req.body;

    try {
        const numericRating = Number(rating);

        if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
            return res.status(400).json({ message: 'Rating must be an integer from 1 to 5' });
        }

        if (!comment || !String(comment).trim()) {
            return res.status(400).json({ message: 'Review comment is required' });
        }

        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const alreadyReviewed = await Review.findOne({
            user: req.user._id,
            product: req.params.id
        });

        if (alreadyReviewed) {
            return res.status(400).json({ message: 'You already reviewed this product' });
        }

        const review = await Review.create({
            user: req.user._id,
            product: req.params.id,
            rating: numericRating,
            comment: String(comment).trim(),
            isPurchased: true
        });

        await recalculateProductRating(product);
        await review.populate('user', 'displayName username avatarUrl');

        res.status(201).json({
            message: 'Review created successfully',
            review,
            averageRating: product.averageRating,
            reviewCount: product.reviewCount,
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const createProduct = async (req, res) => {
    try {
        const { name, price, description, category, stock, images, specifications } = req.body;
        const validationError = validateProductPayload({ name, price, description, category, stock });

        if (validationError) {
            return res.status(400).json({ message: validationError });
        }

        const product = new Product({
            name: String(name).trim(),
            price: Number(price),
            description: String(description).trim(),
            category,
            stock: Number(stock),
            images: normalizeImages(images),
            specifications: normalizeSpecifications(specifications),
        });

        const createdProduct = await product.save();
        res.status(201).json(createdProduct);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateProduct = async (req, res) => {
    try {
        const { name, price, description, category, stock, images, specifications } = req.body;
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const nextProduct = {
            name: name ?? product.name,
            price: price ?? product.price,
            description: description ?? product.description,
            category: category ?? product.category,
            stock: stock ?? product.stock,
        };
        const validationError = validateProductPayload(nextProduct);

        if (validationError) {
            return res.status(400).json({ message: validationError });
        }

        product.name = String(nextProduct.name).trim();
        product.price = Number(nextProduct.price);
        product.description = String(nextProduct.description).trim();
        product.category = nextProduct.category;
        product.stock = Number(nextProduct.stock);

        if (images !== undefined) {
            product.images = normalizeImages(images);
        }

        if (specifications !== undefined) {
            product.specifications = normalizeSpecifications(specifications);
        }

        const updatedProduct = await product.save();
        res.json(updatedProduct);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        await product.deleteOne();
        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
