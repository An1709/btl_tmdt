import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import mongoose from 'mongoose';

const populateCart = (query) => query.populate('items.product');

const getOrCreateCart = async (userId) => {
    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
        cart = await Cart.create({ user: userId, items: [] });
    }

    return cart;
};

const toCartResponse = (cart) => ({
    items: (cart.items || [])
        .filter((item) => item.product)
        .map((item) => ({
            product: item.product,
            quantity: item.quantity,
        })),
});

export const getCart = async (req, res, next) => {
    try {
        const cart = await populateCart(Cart.findOne({ user: req.user._id }));
        return res.json(toCartResponse(cart || { items: [] }));
    } catch (error) {
        next(error);
    }
};

export const addCartItem = async (req, res, next) => {
    try {
        const { productId, quantity = 1 } = req.body;
        const numericQuantity = Number(quantity);

        if (!productId || !mongoose.isValidObjectId(productId) || !Number.isInteger(numericQuantity) || numericQuantity < 1) {
            return res.status(400).json({ message: 'Thông tin sản phẩm hoặc số lượng không hợp lệ.' });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
        }

        const cart = await getOrCreateCart(req.user._id);
        const existingItem = cart.items.find((item) => item.product.toString() === productId);

        if (existingItem) {
            existingItem.quantity += numericQuantity;
        } else {
            cart.items.push({ product: productId, quantity: numericQuantity });
        }

        await cart.save();
        const populatedCart = await populateCart(Cart.findOne({ user: req.user._id }));
        return res.status(200).json(toCartResponse(populatedCart));
    } catch (error) {
        next(error);
    }
};

export const addComboItems = async (req, res, next) => {
    try {
        const rawItems = Array.isArray(req.body?.items)
            ? req.body.items
            : Array.isArray(req.body?.productIds)
                ? req.body.productIds.map((productId) => ({ productId, quantity: 1 }))
                : [];
        const normalizedItems = rawItems
            .map((item) => ({
                productId: String(item?.productId || item?.product || '').trim(),
                quantity: Number(item?.quantity || 1),
            }))
            .filter((item) =>
                mongoose.isValidObjectId(item.productId)
                && Number.isInteger(item.quantity)
                && item.quantity > 0,
            );

        if (!normalizedItems.length) {
            return res.status(400).json({ message: 'Danh sÃ¡ch sáº£n pháº©m combo khÃ´ng há»£p lá»‡.' });
        }

        const productIds = [...new Set(normalizedItems.map((item) => item.productId))];
        const products = await Product.find({ _id: { $in: productIds }, stock: { $gt: 0 } }).select('_id stock');
        const inStockIds = new Set(products.map((product) => product._id.toString()));
        const comboItems = normalizedItems.filter((item) => inStockIds.has(item.productId));

        if (!comboItems.length) {
            return res.status(400).json({ message: 'CÃ¡c sáº£n pháº©m combo hiá»‡n Ä‘Ã£ háº¿t hÃ ng.' });
        }

        const cart = await getOrCreateCart(req.user._id);

        comboItems.forEach((item) => {
            const existingItem = cart.items.find((cartItem) => cartItem.product.toString() === item.productId);

            if (existingItem) {
                existingItem.quantity += item.quantity;
            } else {
                cart.items.push({ product: item.productId, quantity: item.quantity });
            }
        });

        await cart.save();
        const populatedCart = await populateCart(Cart.findOne({ user: req.user._id }));
        return res.status(200).json(toCartResponse(populatedCart));
    } catch (error) {
        next(error);
    }
};

export const updateCartItem = async (req, res, next) => {
    try {
        const { quantity } = req.body;
        const { productId } = req.params;
        const numericQuantity = Number(quantity);

        if (!mongoose.isValidObjectId(productId) || !Number.isInteger(numericQuantity)) {
            return res.status(400).json({ message: 'Số lượng không hợp lệ.' });
        }

        const cart = await getOrCreateCart(req.user._id);
        const item = cart.items.find((cartItem) => cartItem.product.toString() === productId);

        if (!item) {
            return res.status(404).json({ message: 'Sản phẩm không có trong giỏ hàng của bạn.' });
        }

        if (numericQuantity <= 0) {
            cart.items = cart.items.filter((cartItem) => cartItem.product.toString() !== productId);
        } else {
            item.quantity = numericQuantity;
        }

        await cart.save();
        const populatedCart = await populateCart(Cart.findOne({ user: req.user._id }));
        return res.status(200).json(toCartResponse(populatedCart));
    } catch (error) {
        next(error);
    }
};

export const removeCartItem = async (req, res, next) => {
    try {
        const { productId } = req.params;
        if (!mongoose.isValidObjectId(productId)) {
            return res.status(400).json({ message: 'Mã sản phẩm không hợp lệ.' });
        }

        const cart = await getOrCreateCart(req.user._id);

        cart.items = cart.items.filter((item) => item.product.toString() !== productId);
        await cart.save();

        const populatedCart = await populateCart(Cart.findOne({ user: req.user._id }));
        return res.status(200).json(toCartResponse(populatedCart));
    } catch (error) {
        next(error);
    }
};

export const clearCart = async (req, res, next) => {
    try {
        const cart = await getOrCreateCart(req.user._id);
        cart.items = [];
        await cart.save();

        return res.status(200).json({ items: [] });
    } catch (error) {
        next(error);
    }
};
