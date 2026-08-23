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
        const nextQuantity = (existingItem?.quantity ?? 0) + numericQuantity;

        if (product.stock < nextQuantity) {
            return res.status(400).json({
                message: product.stock > 0
                    ? `Chỉ còn ${product.stock} sản phẩm trong kho. Giỏ hàng của bạn không thể vượt quá số lượng này.`
                    : 'Sản phẩm hiện đã hết hàng.',
            });
        }

        if (existingItem) {
            existingItem.quantity = nextQuantity;
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
        const normalizedItems = rawItems.map((item) => ({
                productId: String(item?.productId || item?.product || '').trim(),
                quantity: Number(item?.quantity ?? 1),
            }));

        if (
            !normalizedItems.length
            || normalizedItems.some((item) =>
                !mongoose.isValidObjectId(item.productId)
                || !Number.isInteger(item.quantity)
                || item.quantity < 1,
            )
        ) {
            return res.status(400).json({ message: 'Danh sách sản phẩm combo không hợp lệ.' });
        }

        const quantitiesByProduct = new Map();
        normalizedItems.forEach((item) => {
            quantitiesByProduct.set(
                item.productId,
                (quantitiesByProduct.get(item.productId) ?? 0) + item.quantity,
            );
        });
        const comboItems = [...quantitiesByProduct.entries()].map(([productId, quantity]) => ({
            productId,
            quantity,
        }));

        if (comboItems.some((item) => !Number.isSafeInteger(item.quantity))) {
            return res.status(400).json({ message: 'Số lượng sản phẩm combo không hợp lệ.' });
        }

        const productIds = comboItems.map((item) => item.productId);
        const products = await Product.find({ _id: { $in: productIds } }).select('_id name stock');
        if (products.length !== productIds.length) {
            return res.status(404).json({ message: 'Một hoặc nhiều sản phẩm trong combo không còn tồn tại.' });
        }

        const productsById = new Map(products.map((product) => [product._id.toString(), product]));
        const cart = await getOrCreateCart(req.user._id);

        for (const item of comboItems) {
            const product = productsById.get(item.productId);
            const existingItem = cart.items.find((cartItem) => cartItem.product.toString() === item.productId);
            const nextQuantity = (existingItem?.quantity ?? 0) + item.quantity;

            if (!product || product.stock < nextQuantity) {
                return res.status(400).json({
                    message: product?.stock > 0
                        ? `${product.name} chỉ còn ${product.stock} sản phẩm trong kho.`
                        : `${product?.name || 'Một sản phẩm trong combo'} hiện đã hết hàng.`,
                });
            }
        }

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
            const product = await Product.findById(productId).select('stock');
            if (!product) {
                return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
            }

            if (product.stock < numericQuantity) {
                return res.status(400).json({
                    message: product.stock > 0
                        ? `Chỉ còn ${product.stock} sản phẩm trong kho.`
                        : 'Sản phẩm hiện đã hết hàng.',
                });
            }

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
