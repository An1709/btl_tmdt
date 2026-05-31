import Product from '../models/Product.js';
import Review from '../models/Review.js';
import APIFeatures from '../utils/apiFeatures.js';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { getAccessTokenSecret } from '../config/auth.js';
import User from '../models/User.js';
import Cart from '../models/Cart.js';
import Order from '../models/Order.js';
import Collection from '../models/Collection.js';

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeText = (value = '') =>
    String(value)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd');

const RECOMMENDATION_KEYWORDS = [
    'meo', 'cho', 'chim', 'ca', 'hamster', 'tho',
    'thuc an', 'do choi', 'vong co', 'cat ve sinh', 'sua tam',
    'pate', 'hat', 'long', 'chuong', 'nha', 'bat', 'day dat', 'phu kien',
];

const PRODUCT_CARD_FIELDS = 'name slug price originalPrice images category stock sold averageRating reviewCount description specifications';
const COMBO_COMPLEMENTARY_TERMS = {
    food: ['do choi', 'toy', 'bat', 'chen', 'cat ve sinh', 've sinh', 'pate', 'snack', 'treat'],
    hygiene: ['thuc an', 'pate', 'do choi', 'xeng', 'khay', 'khu mui'],
    toy: ['thuc an', 'pate', 'snack', 'treat', 'vong co', 'day dat', 'long', 'chuong'],
    collar: ['day dat', 'vong co', 'ao', 'quan ao', 'snack', 'do choi'],
    cage: ['thuc an', 'do choi', 'vitamin', 'bat', 'nuoc'],
    fish: ['thuc an', 'aquarium', 'be ca', 'loc nuoc', 'den', 'phu kien'],
    bird: ['long', 'chuong', 'do choi', 'thuc an', 'vitamin'],
};

const FEATURED_PRODUCT_PROJECT = {
    _id: 1,
    name: 1,
    slug: 1,
    price: 1,
    originalPrice: 1,
    images: 1,
    stock: 1,
    sold: 1,
    views: 1,
    category: {
        _id: '$category._id',
        name: '$category.name',
        slug: '$category.slug',
    },
    averageRating: '$actualAverageRating',
    reviewCount: '$actualReviewCount',
};

const getTokenFromRequest = (req) => {
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        return req.headers.authorization.split(' ')[1];
    }

    if (req.cookies && req.cookies.jwt) {
        return req.cookies.jwt;
    }

    return null;
};

const getOptionalUser = async (req) => {
    try {
        const token = getTokenFromRequest(req);
        if (!token) return null;

        const decoded = jwt.verify(token, getAccessTokenSecret());
        const user = await User.findById(decoded.userId).select('_id isBlocked isEmailVerified');

        if (!user || user.isBlocked || user.isEmailVerified === false) {
            return null;
        }

        return user;
    } catch {
        return null;
    }
};

const getSpecificationText = (specifications) => {
    if (!specifications) return '';

    if (specifications instanceof Map) {
        return [...specifications.entries()].flat().join(' ');
    }

    if (typeof specifications === 'object') {
        return Object.entries(specifications).flat().join(' ');
    }

    return String(specifications);
};

const getRecommendationKeywords = (product) => {
    const searchableText = normalizeText([
        product.name,
        product.description,
        getSpecificationText(product.specifications),
    ].join(' '));

    return RECOMMENDATION_KEYWORDS.filter((keyword) => searchableText.includes(keyword));
};

const getRecommendationText = (product) => normalizeText([
    product.name,
    product.description,
    getSpecificationText(product.specifications),
].join(' '));

const getComboProductType = (product) => {
    const text = getRecommendationText(product);

    if (/(ca|fish|aquarium|be ca|thuy sinh)/.test(text)) return 'fish';
    if (/(vet|chim|bird|parrot)/.test(text)) return 'bird';
    if (/(thuc an|do an|food|hat|pate)/.test(text)) return 'food';
    if (/(cat ve sinh|sua tam|ve sinh|khu mui|cham soc)/.test(text)) return 'hygiene';
    if (/(do choi|toy|bong|gam)/.test(text)) return 'toy';
    if (/(vong co|day dat|leash|collar)/.test(text)) return 'collar';
    if (/(long|chuong|nha|cage)/.test(text)) return 'cage';

    return 'default';
};

const getComboKeywords = (product) => {
    const productType = getComboProductType(product);
    const ownKeywords = getRecommendationKeywords(product);
    const complementaryKeywords = COMBO_COMPLEMENTARY_TERMS[productType] || [
        'thuc an', 'do choi', 'phu kien', 've sinh', 'snack',
    ];

    return [...new Set([...complementaryKeywords, ...ownKeywords])];
};

const getKeywordScore = (product, keywords) => {
    const searchableText = getRecommendationText(product);
    return keywords.reduce((score, keyword) => (
        searchableText.includes(keyword) ? score + 1 : score
    ), 0);
};

const pickUniqueProducts = (groups, limit, excludeId) => {
    const seen = new Set([String(excludeId)]);
    const products = [];

    groups.flat().forEach((product) => {
        const productId = String(product._id);
        if (seen.has(productId) || products.length >= limit) return;
        seen.add(productId);
        products.push(product);
    });

    return products;
};

const pickUniqueProductList = (groups, limit, excludedIds = []) => {
    const seen = new Set(excludedIds.map((id) => String(id)));
    const products = [];

    groups.flat().forEach((product) => {
        const productId = String(product._id);
        if (seen.has(productId) || products.length >= limit) return;
        seen.add(productId);
        products.push(product);
    });

    return products;
};

const collectSignalProductIds = (items = []) => items
    .map((item) => item?.product?._id || item?.product || item?._id || item)
    .filter((id) => id && mongoose.isValidObjectId(id))
    .map((id) => String(id));

const getCategoryId = (product) => String(product.category?._id || product.category || '');

const getPersonalizedScore = (product, signal) => {
    const categoryId = getCategoryId(product);
    const searchableText = getRecommendationText(product);
    const keywordScore = [...signal.keywords].reduce((score, keyword) => (
        searchableText.includes(keyword) ? score + 1 : score
    ), 0);

    let score = 0;
    if (signal.favoriteCategories.has(categoryId)) score += 30;
    if (signal.cartCategories.has(categoryId)) score += 20;
    if (signal.purchasedCategories.has(categoryId)) score += 12;
    score += keywordScore * 3;
    score += Math.min(product.reviewCount || 0, 10);
    score += (product.averageRating || 0);
    score += Math.min(product.sold || 0, 50) / 10;
    score += Math.min(product.views || 0, 100) / 25;

    return score;
};

const toProductCardPayload = (product) => ({
    _id: product._id,
    name: product.name,
    slug: product.slug,
    price: product.price,
    originalPrice: product.originalPrice,
    images: product.images,
    category: product.category,
    stock: product.stock,
    averageRating: product.averageRating || 0,
    reviewCount: product.reviewCount || 0,
    sold: product.sold || 0,
    views: product.views || 0,
});

const getFeaturedProductList = async (limit, excludedIds = []) => {
    const excludedObjectIds = excludedIds
        .filter((id) => mongoose.isValidObjectId(id))
        .map((id) => new mongoose.Types.ObjectId(id));
    const excludedMatch = excludedObjectIds.length ? { _id: { $nin: excludedObjectIds } } : {};

    const reviewedProducts = await Product.aggregate([
        { $match: excludedMatch },
        {
            $lookup: {
                from: 'reviews',
                localField: '_id',
                foreignField: 'product',
                as: 'reviews',
            },
        },
        {
            $addFields: {
                actualReviewCount: { $size: '$reviews' },
                actualAverageRating: {
                    $ifNull: [{ $avg: '$reviews.rating' }, 0],
                },
            },
        },
        { $match: { actualReviewCount: { $gt: 0 } } },
        {
            $lookup: {
                from: 'categories',
                localField: 'category',
                foreignField: '_id',
                as: 'category',
            },
        },
        { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
        { $sort: { stock: -1, actualReviewCount: -1, actualAverageRating: -1, sold: -1, views: -1, createdAt: -1 } },
        { $limit: limit },
        { $project: FEATURED_PRODUCT_PROJECT },
    ]);

    let products = reviewedProducts;

    if (products.length < limit) {
        const selectedIds = products.map((product) => product._id);
        const fallbackProducts = await Product.aggregate([
            { $match: { _id: { $nin: [...excludedObjectIds, ...selectedIds] } } },
            {
                $lookup: {
                    from: 'reviews',
                    localField: '_id',
                    foreignField: 'product',
                    as: 'reviews',
                },
            },
            {
                $addFields: {
                    actualReviewCount: { $size: '$reviews' },
                    actualAverageRating: {
                        $ifNull: [{ $avg: '$reviews.rating' }, 0],
                    },
                },
            },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'category',
                    foreignField: '_id',
                    as: 'category',
                },
            },
            { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
            { $sort: { stock: -1, sold: -1, views: -1, actualAverageRating: -1, actualReviewCount: -1, createdAt: -1 } },
            { $limit: limit - products.length },
            { $project: FEATURED_PRODUCT_PROJECT },
        ]);

        products = [...products, ...fallbackProducts];
    }

    return products;
};

const recalculateProductRating = async (product) => {
    const reviews = await Review.find({ product: product._id });
    product.reviewCount = reviews.length;
    product.averageRating = reviews.length
        ? reviews.reduce((acc, item) => item.rating + acc, 0) / reviews.length
        : 0;
    await product.save({ validateBeforeSave: false });
};

const getReviewSummary = async (productIds) => {
    const ids = Array.isArray(productIds) ? productIds : [productIds];
    const summary = await Review.aggregate([
        { $match: { product: { $in: ids } } },
        {
            $group: {
                _id: '$product',
                reviewCount: { $sum: 1 },
                averageRating: { $avg: '$rating' },
            },
        },
    ]);

    return new Map(summary.map((item) => [
        String(item._id),
        {
            reviewCount: item.reviewCount,
            averageRating: item.averageRating || 0,
        },
    ]));
};

const applyReviewSummary = (product, summaryMap) => {
    const productObject = typeof product.toObject === 'function'
        ? product.toObject({ virtuals: true })
        : product;
    const summary = summaryMap.get(String(productObject._id)) || {
        reviewCount: 0,
        averageRating: 0,
    };

    return {
        ...productObject,
        reviewCount: summary.reviewCount,
        averageRating: summary.averageRating,
    };
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
        const summaryMap = await getReviewSummary(products.map((product) => product._id));

        res.json({
            products: products.map((product) => applyReviewSummary(product, summaryMap)),
            page: Number(req.query.page) || 1,
            pages: Math.ceil(totalProducts / (Number(req.query.limit) || 10)),
            total: totalProducts
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getFeaturedProducts = async (req, res) => {
    try {
        const limit = Math.min(Math.max(Number(req.query.limit) || 8, 1), 8);
        const products = await getFeaturedProductList(limit);

        res.json({ products });
    } catch {
        res.status(500).json({ message: 'Không thể tải sản phẩm nổi bật.' });
    }
};

export const getPersonalizedRecommendations = async (req, res) => {
    try {
        const limit = Math.min(Math.max(Number(req.query.limit) || 8, 1), 8);
        const user = await getOptionalUser(req);

        if (!user) {
            const products = await getFeaturedProductList(limit);
            return res.json({ products });
        }

        const [cart, collection, orders] = await Promise.all([
            Cart.findOne({ user: user._id }).lean(),
            Collection.findOne({ user: user._id }).lean(),
            Order.find({
                user: user._id,
                status: { $ne: 'Cancelled' },
                cancelStatus: { $ne: 'approved' },
            }).select('orderItems.product').lean(),
        ]);

        const favoriteIds = collectSignalProductIds(collection?.products || []);
        const cartIds = collectSignalProductIds(cart?.items || []);
        const purchasedIds = collectSignalProductIds(orders.flatMap((order) => order.orderItems || []));
        const signalIds = [...new Set([...favoriteIds, ...cartIds, ...purchasedIds])];
        const excludedIds = [...new Set([...favoriteIds, ...cartIds])];

        if (signalIds.length === 0) {
            const products = await getFeaturedProductList(limit);
            return res.json({ products });
        }

        const signalProducts = await Product.find({ _id: { $in: signalIds } })
            .select(PRODUCT_CARD_FIELDS)
            .lean();
        const signalMap = new Map(signalProducts.map((product) => [String(product._id), product]));
        const favoriteProducts = favoriteIds.map((id) => signalMap.get(id)).filter(Boolean);
        const cartProducts = cartIds.map((id) => signalMap.get(id)).filter(Boolean);
        const purchasedProducts = purchasedIds.map((id) => signalMap.get(id)).filter(Boolean);

        const signal = {
            favoriteCategories: new Set(favoriteProducts.map(getCategoryId).filter(Boolean)),
            cartCategories: new Set(cartProducts.map(getCategoryId).filter(Boolean)),
            purchasedCategories: new Set(purchasedProducts.map(getCategoryId).filter(Boolean)),
            keywords: new Set([...favoriteProducts, ...cartProducts, ...purchasedProducts].flatMap(getRecommendationKeywords)),
        };
        const categoryIds = [...new Set([
            ...signal.favoriteCategories,
            ...signal.cartCategories,
            ...signal.purchasedCategories,
        ])].filter((id) => mongoose.isValidObjectId(id));
        const excludedObjectIds = excludedIds.map((id) => new mongoose.Types.ObjectId(id));
        const baseFilter = {
            stock: { $gt: 0 },
            ...(excludedObjectIds.length ? { _id: { $nin: excludedObjectIds } } : {}),
        };

        const sameCategoryProducts = categoryIds.length
            ? await Product.find({
                ...baseFilter,
                category: { $in: categoryIds.map((id) => new mongoose.Types.ObjectId(id)) },
            })
                .select(PRODUCT_CARD_FIELDS)
                .populate('category', 'name slug')
                .sort({ averageRating: -1, reviewCount: -1, sold: -1, views: -1, createdAt: -1 })
                .limit(40)
                .lean()
            : [];

        const similarCandidates = await Product.find(baseFilter)
            .select(PRODUCT_CARD_FIELDS)
            .populate('category', 'name slug')
            .sort({ sold: -1, views: -1, averageRating: -1, reviewCount: -1, createdAt: -1 })
            .limit(80)
            .lean();

        const scoredProducts = pickUniqueProductList([sameCategoryProducts, similarCandidates], 80, excludedIds)
            .map((product) => ({
                product,
                score: getPersonalizedScore(product, signal),
            }))
            .filter((item) => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .map((item) => item.product);

        let products = pickUniqueProductList([scoredProducts], limit, excludedIds);

        if (products.length < limit) {
            const fallbackProducts = await getFeaturedProductList(limit - products.length, [
                ...excludedIds,
                ...products.map((product) => product._id),
            ]);
            products = pickUniqueProductList([products, fallbackProducts], limit, excludedIds);
        }

        res.json({ products: products.map(toProductCardPayload) });
    } catch {
        res.status(500).json({ message: 'Không thể tải gợi ý dành cho bạn.' });
    }
};

export const getProductSearchSuggestions = async (req, res) => {
    try {
        const keyword = String(req.query.q || '').trim();
        const limit = Math.min(Math.max(Number(req.query.limit) || 6, 1), 8);

        if (!keyword) {
            return res.json({ products: [] });
        }

        const regex = new RegExp(escapeRegex(keyword), 'i');

        const products = await Product.aggregate([
            {
                $lookup: {
                    from: 'categories',
                    localField: 'category',
                    foreignField: '_id',
                    as: 'category',
                },
            },
            { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
            {
                $addFields: {
                    specificationPairs: {
                        $objectToArray: { $ifNull: ['$specifications', {}] },
                    },
                },
            },
            {
                $addFields: {
                    specificationText: {
                        $reduce: {
                            input: '$specificationPairs',
                            initialValue: '',
                            in: {
                                $concat: [
                                    '$$value',
                                    ' ',
                                    { $ifNull: ['$$this.k', ''] },
                                    ' ',
                                    { $ifNull: ['$$this.v', ''] },
                                ],
                            },
                        },
                    },
                },
            },
            {
                $match: {
                    $or: [
                        { name: regex },
                        { description: regex },
                        { specificationText: regex },
                        { 'category.name': regex },
                        { 'category.slug': regex },
                    ],
                },
            },
            { $sort: { stock: -1, averageRating: -1, sold: -1, createdAt: -1 } },
            { $limit: limit },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    slug: 1,
                    price: 1,
                    originalPrice: 1,
                    images: 1,
                    stock: 1,
                    averageRating: 1,
                    category: {
                        _id: '$category._id',
                        name: '$category.name',
                        slug: '$category.slug',
                    },
                },
            },
        ]);

        res.json({ products });
    } catch {
        res.status(500).json({ message: 'Không thể tìm kiếm gợi ý sản phẩm.' });
    }
};

export const getProductRecommendations = async (req, res) => {
    try {
        const productId = req.params.id;
        const limit = Math.min(Math.max(Number(req.query.limit) || 8, 4), 8);

        if (!mongoose.isValidObjectId(productId)) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const currentProduct = await Product.findById(productId)
            .select('name description category specifications')
            .lean();

        if (!currentProduct) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const keywords = getRecommendationKeywords(currentProduct);
        const baseFilter = { _id: { $ne: currentProduct._id } };
        const inStockFilter = { ...baseFilter, stock: { $gt: 0 } };

        const sameCategoryProducts = await Product.find({
            ...inStockFilter,
            category: currentProduct.category,
        })
            .select(PRODUCT_CARD_FIELDS)
            .populate('category', 'name slug')
            .sort({ averageRating: -1, sold: -1, views: -1, reviewCount: -1, createdAt: -1 })
            .limit(limit)
            .lean();

        const similarCandidates = keywords.length
            ? await Product.find({
                ...inStockFilter,
                category: { $ne: currentProduct.category },
            })
                .select(PRODUCT_CARD_FIELDS)
                .populate('category', 'name slug')
                .sort({ averageRating: -1, sold: -1, views: -1, reviewCount: -1, createdAt: -1 })
                .limit(40)
                .lean()
            : [];
        const similarProducts = similarCandidates
            .map((product) => ({
                product,
                score: getKeywordScore(product, keywords),
            }))
            .filter((item) => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map((item) => item.product);

        const popularInStockProducts = await Product.find(inStockFilter)
            .select(PRODUCT_CARD_FIELDS)
            .populate('category', 'name slug')
            .sort({ sold: -1, views: -1, averageRating: -1, reviewCount: -1, createdAt: -1 })
            .limit(limit)
            .lean();

        let products = pickUniqueProducts([
            sameCategoryProducts,
            similarProducts,
            popularInStockProducts,
        ], limit, currentProduct._id);

        if (products.length < 4) {
            const fallbackProducts = await Product.find(baseFilter)
                .select(PRODUCT_CARD_FIELDS)
                .populate('category', 'name slug')
                .sort({ stock: -1, sold: -1, views: -1, averageRating: -1, reviewCount: -1, createdAt: -1 })
                .limit(limit)
                .lean();

            products = pickUniqueProducts([products, fallbackProducts], limit, currentProduct._id);
        }

        res.json({ products });
    } catch {
        res.status(500).json({ message: 'Không thể tải sản phẩm liên quan.' });
    }
};

export const getProductComboSuggestions = async (req, res) => {
    try {
        const productId = req.params.id;
        const limit = Math.min(Math.max(Number(req.query.limit) || 4, 2), 4);

        if (!mongoose.isValidObjectId(productId)) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const currentProduct = await Product.findById(productId)
            .select(PRODUCT_CARD_FIELDS)
            .populate('category', 'name slug')
            .lean();

        if (!currentProduct) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const keywords = getComboKeywords(currentProduct);
        const regexes = keywords.map((keyword) => new RegExp(escapeRegex(keyword), 'i'));
        const baseFilter = {
            _id: { $ne: currentProduct._id },
            stock: { $gt: 0 },
        };

        const complementaryCandidates = regexes.length
            ? await Product.find({
                ...baseFilter,
                $or: [
                    ...regexes.map((regex) => ({ name: regex })),
                    ...regexes.map((regex) => ({ description: regex })),
                    ...regexes.map((regex) => ({ 'specifications.Giống': regex })),
                    ...regexes.map((regex) => ({ 'specifications.Loại': regex })),
                    ...regexes.map((regex) => ({ 'specifications.Dành cho': regex })),
                ],
            })
                .select(PRODUCT_CARD_FIELDS)
                .populate('category', 'name slug')
                .sort({ sold: -1, averageRating: -1, reviewCount: -1, views: -1, createdAt: -1 })
                .limit(40)
                .lean()
            : [];
        const scoredComplementary = complementaryCandidates
            .map((product) => ({
                product,
                score: getKeywordScore(product, keywords) + Number(getCategoryId(product) === getCategoryId(currentProduct)),
            }))
            .filter((item) => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .map((item) => item.product);

        const sameCategoryProducts = await Product.find({
            ...baseFilter,
            category: currentProduct.category?._id || currentProduct.category,
        })
            .select(PRODUCT_CARD_FIELDS)
            .populate('category', 'name slug')
            .sort({ sold: -1, averageRating: -1, reviewCount: -1, views: -1, createdAt: -1 })
            .limit(limit)
            .lean();
        const popularProducts = await Product.find(baseFilter)
            .select(PRODUCT_CARD_FIELDS)
            .populate('category', 'name slug')
            .sort({ stock: -1, sold: -1, views: -1, averageRating: -1, reviewCount: -1, createdAt: -1 })
            .limit(limit)
            .lean();
        const products = pickUniqueProductList([
            scoredComplementary,
            sameCategoryProducts,
            popularProducts,
        ], limit, [currentProduct._id]);

        res.json({ products: products.map(toProductCardPayload) });
    } catch {
        res.status(500).json({ message: 'KhÃ´ng thá»ƒ táº£i sáº£n pháº©m mua kÃ¨m.' });
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

        const reviews = product.reviews || [];
        const reviewCount = reviews.length;
        const averageRating = reviewCount
            ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount
            : 0;

        product.views = (product.views || 0) + 1;
        product.reviewCount = reviewCount;
        product.averageRating = averageRating;
        product.save({ validateBeforeSave: false }).catch(() => {});

        const responseProduct = product.toObject({ virtuals: true });
        responseProduct.reviewCount = reviewCount;
        responseProduct.averageRating = averageRating;

        res.json(responseProduct);
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
