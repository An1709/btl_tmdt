import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Category from '../models/Category.js';

const MAX_MESSAGE_LENGTH = 2000;
const PRODUCT_LIMIT = 5;
const ORDER_LIMIT = 5;

const ORDER_STATUS_LABELS = {
    Pending: 'Chờ xác nhận',
    Processing: 'Đang xử lý',
    Shipping: 'Đang giao',
    Delivered: 'Đã giao',
    Cancelled: 'Đã hủy',
};

const PAYMENT_LABELS = {
    cod: 'Thanh toán khi nhận hàng (COD)',
    vnpay: 'Thanh toán qua VNPay',
};

const CANCELLABLE_STATUSES = ['Pending', 'Processing'];

const INTENT_KEYWORDS = {
    greeting: ['xin chao', 'chao', 'hello', 'hi', 'hey', 'alo'],
    product: [
        'san pham', 'thuc an', 'do an', 'hat', 'pate', 'phu kien', 'do choi',
        'vong co', 'day dat', 'long', 'chuong', 'nem', 'sua tam', 've sinh',
        'mua gi', 'goi y', 'tu van', 'con hang', 'ton kho', 'meo',
        'cat', 'dog', 'kitten', 'puppy', 'giam gia', 'khuyen mai', 'sale',
    ],
    sale: ['giam gia', 'khuyen mai', 'sale', 'uu dai', 'gia tot', 'dang giam'],
    cart: ['gio hang', 'them vao gio', 'xoa gio', 'cap nhat so luong', 'so luong'],
    checkout: ['dat hang', 'checkout', 'mua hang', 'dia chi giao hang', 'phi ship'],
    payment: ['thanh toan', 'cod', 'vnpay', 'chuyen khoan', 'tra tien'],
    order: ['don hang', 'ma don', 'trang thai', 'giao hang', 'van chuyen', 'order', 'gan nhat'],
    cancel: ['huy don', 'yeu cau huy', 'khong muon mua', 'doi y'],
    forgotPassword: ['quen mat khau', 'dat lai mat khau', 'reset password', 'khong dang nhap duoc'],
    account: ['tai khoan', 'dang nhap', 'dang ky', 'xac minh email', 'ho so', 'profile'],
    warranty: ['bao hanh', 'doi tra', 'hoan hang', 'khieu nai', 'lien he ho tro'],
    health: ['benh', 'non', 'tieu chay', 'bo an', 'sot', 'chan doan', 'bac si thu y', 'thu y'],
    unsafe: ['api key', 'token', 'env', 'bien moi truong', 'mat khau', 'password', 'otp', 'secret', 'hidden prompt', 'system prompt', 'ma nguon', 'database', 'ignore previous instructions'],
};

const SEARCH_SYNONYMS = {
    meo: ['mèo', 'meo', 'cat', 'kitten', 'mèo con', 'pate mèo', 'hạt mèo'],
    cho: ['chó', 'cho', 'dog', 'puppy', 'cún', 'cún con', 'hạt chó'],
    con: ['con', 'nhỏ', 'baby', 'kitten', 'puppy', 'sơ sinh'],
    thuc: ['thức ăn', 'thuc an', 'food', 'hạt', 'pate', 'dinh dưỡng'],
    phu: ['phụ kiện', 'phu kien', 'accessory', 'vòng cổ', 'dây dắt', 'đồ chơi'],
    long: ['lồng', 'chuồng', 'nệm', 'nhà'],
    tam: ['tắm', 'sữa tắm', 'vệ sinh', 'khử mùi'],
};

export const validateChatMessage = (message) => {
    if (typeof message !== 'string' || !message.trim()) {
        return 'Vui lòng nhập nội dung cần hỗ trợ.';
    }

    if (message.trim().length > MAX_MESSAGE_LENGTH) {
        return `Tin nhắn quá dài. Vui lòng nhập tối đa ${MAX_MESSAGE_LENGTH} ký tự.`;
    }

    return null;
};

const normalizeText = (value = '') =>
    String(value)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd');

const hasAnyKeyword = (normalizedMessage, keywords) =>
    keywords.some((keyword) => normalizedMessage.includes(keyword));

const detectIntent = (message) => {
    const normalizedMessage = normalizeText(message);

    const intent = Object.fromEntries(
        Object.entries(INTENT_KEYWORDS).map(([intent, keywords]) => [
            intent,
            hasAnyKeyword(normalizedMessage, keywords),
        ]),
    );

    intent.product = intent.product || /\b(chó|mèo)\b/i.test(message) || /\bcho\s+cho\b/.test(normalizedMessage);

    return intent;
};

const formatCurrency = (amount) =>
    Number(amount || 0).toLocaleString('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    });

const stripHtml = (value = '') => String(value).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getRawTerms = (message) =>
    String(message)
        .toLowerCase()
        .split(/[^a-zA-ZÀ-ỹ0-9]+/)
        .map((word) => word.trim())
        .filter(Boolean);

const getPetSpecies = (message) => {
    const normalizedMessage = normalizeText(message);
    if (/\b(mèo|meo|cat|kitten)\b/i.test(message) || /\b(meo|cat|kitten)\b/.test(normalizedMessage)) {
        return 'cat';
    }
    if (/\b(chó|dog|puppy|cún)\b/i.test(message) || /\b(dog|puppy|cun)\b/.test(normalizedMessage) || /\bcho\s+cho\b/.test(normalizedMessage)) {
        return 'dog';
    }
    return '';
};

const extractProductKeywords = (message, intent) => {
    const ignoredWords = new Set([
        'toi', 'minh', 'ban', 'can', 'muon', 'tim', 'cho', 'mua', 'hang',
        'san', 'pham', 'goi', 'tu', 'van', 'petmart', 'co', 'khong',
        'gia', 'bao', 'nhieu', 'loai', 'nao', 'giup', 'mot', 'vai',
        'giam', 'khuyen', 'mai', 'sale', 'uu', 'dai', 'dang',
    ]);

    const normalizedWords = normalizeText(message)
        .split(/[^a-z0-9]+/)
        .map((word) => word.trim())
        .filter((word) => word.length >= 2 && !ignoredWords.has(word));

    const rawWords = getRawTerms(message)
        .filter((word) => word.length >= 2)
        .filter((word) => !ignoredWords.has(normalizeText(word)) || /^chó$/i.test(word));

    const keywords = new Set([...normalizedWords, ...rawWords]);

    if (intent.sale) {
        ['sale', 'giảm giá', 'khuyến mãi'].forEach((keyword) => keywords.add(keyword));
    }

    [...keywords].forEach((keyword) => {
        const synonymKey = Object.keys(SEARCH_SYNONYMS).find((key) => keyword.includes(key) || key.includes(normalizeText(keyword)));
        if (synonymKey) {
            SEARCH_SYNONYMS[synonymKey].forEach((term) => keywords.add(term));
        }
    });

    return [...keywords].slice(0, 18);
};

const buildProductFilter = async (message, intent, keywords) => {
    const filters = [];
    const normalizedMessage = normalizeText(message);
    const textKeywords = intent.sale
        ? keywords.filter((keyword) => !['sale', 'giam', 'gia', 'giam gia', 'khuyen', 'mai', 'khuyen mai', 'uu', 'dai', 'uu dai'].includes(normalizeText(keyword)))
        : keywords;

    if (intent.sale) {
        filters.push({ originalPrice: { $exists: true, $gt: 0 } });
        filters.push({ $expr: { $gt: ['$originalPrice', '$price'] } });
    }

    if (!textKeywords.length) {
        return filters.length ? { $and: filters } : {};
    }

    const regexes = textKeywords.map((keyword) => new RegExp(escapeRegex(keyword), 'i'));
    const categories = await Category.find({
        $or: [
            ...regexes.map((regex) => ({ name: regex })),
            ...regexes.map((regex) => ({ slug: regex })),
            ...regexes.map((regex) => ({ description: regex })),
        ],
    }).select('_id').lean();

    filters.push({
        $or: [
            ...regexes.map((regex) => ({ name: regex })),
            ...regexes.map((regex) => ({ description: regex })),
            ...(categories.length ? [{ category: { $in: categories.map((category) => category._id) } }] : []),
        ],
    });

    const speciesTerms = [];
    const petSpecies = getPetSpecies(message);
    if (petSpecies === 'cat') {
        speciesTerms.push('mèo', 'meo', 'cat', 'kitten');
    } else if (petSpecies === 'dog') {
        speciesTerms.push('chó', 'dog', 'puppy', 'cún', 'cun');
    }

    if (speciesTerms.length) {
        const speciesRegexes = speciesTerms.map((keyword) => new RegExp(escapeRegex(keyword), 'i'));
        const speciesCategories = await Category.find({
            $or: [
                ...speciesRegexes.map((regex) => ({ name: regex })),
                ...speciesRegexes.map((regex) => ({ slug: regex })),
                ...speciesRegexes.map((regex) => ({ description: regex })),
            ],
        }).select('_id').lean();

        filters.push({
            $or: [
                ...speciesRegexes.map((regex) => ({ name: regex })),
                ...speciesRegexes.map((regex) => ({ description: regex })),
                ...(speciesCategories.length ? [{ category: { $in: speciesCategories.map((category) => category._id) } }] : []),
            ],
        });
    }

    return { $and: filters };
};

const getProductSearchText = (product) => normalizeText([
    product.name,
    product.description,
    product.category?.name,
    formatSpecifications(product.specifications),
].filter(Boolean).join(' '));

const productMatchesSpecies = (product, species) => {
    if (!species) return true;
    const productName = normalizeText(product.name);
    const categoryText = normalizeText([product.category?.name, product.category?.slug].filter(Boolean).join(' '));
    const descriptiveText = normalizeText([product.description, formatSpecifications(product.specifications)].filter(Boolean).join(' '));

    if (species === 'cat') {
        return ['meo', 'cat', 'kitten'].some((term) => productName.includes(term) || categoryText.includes(term) || descriptiveText.includes(term));
    }

    return ['dog', 'puppy', 'cun'].some((term) => productName.includes(term) || categoryText.includes(term) || descriptiveText.includes(term));
};

const getProductMatchScore = (product, keywords) => {
    const searchText = getProductSearchText(product);
    const productName = normalizeText(product.name);
    const categoryName = normalizeText(product.category?.name || '');
    const ignoredRankingTerms = new Set(['meo', 'cat', 'kitten', 'cho', 'dog', 'puppy', 'cun', 'con', 'nho', 'baby']);

    return keywords.reduce((score, keyword) => {
        const normalizedKeyword = normalizeText(keyword);
        if (!normalizedKeyword || ignoredRankingTerms.has(normalizedKeyword)) return score;
        if (productName.includes(normalizedKeyword)) return score + 8;
        if (categoryName.includes(normalizedKeyword)) return score + 4;
        if (searchText.includes(normalizedKeyword)) return score + 2;
        return score;
    }, 0);
};

const sortProductsForSupport = (products, keywords) =>
    [...products].sort((a, b) => {
        const relevanceScore = getProductMatchScore(b, keywords) - getProductMatchScore(a, keywords);
        if (relevanceScore) return relevanceScore;
        const stockScore = Number(b.stock > 0) - Number(a.stock > 0);
        if (stockScore) return stockScore;
        const ratingScore = Number(b.averageRating || 0) - Number(a.averageRating || 0);
        if (ratingScore) return ratingScore;
        return Number(b.sold || 0) - Number(a.sold || 0);
    });

const findRelevantProducts = async (message, intent) => {
    try {
        const keywords = extractProductKeywords(message, intent);
        const petSpecies = getPetSpecies(message);
        const filter = await buildProductFilter(message, intent, keywords);
        const products = await Product.find(filter)
            .populate('category', 'name slug')
            .select('name price originalPrice stock sold description category averageRating reviewCount specifications')
            .sort({ stock: -1, averageRating: -1, sold: -1, createdAt: -1 })
            .limit(12)
            .lean();
        let speciesProducts = petSpecies
            ? products.filter((product) => productMatchesSpecies(product, petSpecies))
            : products;

        if (petSpecies && !speciesProducts.length) {
            const broaderProducts = await Product.find({})
                .populate('category', 'name slug')
                .select('name price originalPrice stock sold description category averageRating reviewCount specifications')
                .sort({ stock: -1, averageRating: -1, sold: -1, createdAt: -1 })
                .limit(50)
                .lean();

            speciesProducts = broaderProducts.filter((product) => productMatchesSpecies(product, petSpecies));
        }

        return {
            products: sortProductsForSupport(petSpecies ? speciesProducts : products, keywords).slice(0, PRODUCT_LIMIT),
            lookupFailed: false,
        };
    } catch {
        return {
            products: [],
            lookupFailed: true,
        };
    }
};

const formatSpecifications = (specifications) => {
    if (!specifications) return '';

    const entries = specifications instanceof Map
        ? [...specifications.entries()]
        : Object.entries(specifications);

    return entries
        .slice(0, 3)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
};

const formatProductRecommendations = (products) =>
    products.map((product, index) => {
        const categoryName = product.category?.name || 'Chưa phân loại';
        const stockLabel = product.stock > 0 ? `còn ${product.stock} sản phẩm` : 'đang hết hàng';
        const originalPrice = product.originalPrice && product.originalPrice > product.price
            ? `, giá gốc ${formatCurrency(product.originalPrice)}`
            : '';
        const rating = product.reviewCount
            ? `, đánh giá ${Number(product.averageRating || 0).toFixed(1)}/5 (${product.reviewCount} lượt)`
            : '';
        const specs = formatSpecifications(product.specifications);
        const description = stripHtml(product.description).slice(0, 120);
        const reason = specs || description || `thuộc danh mục ${categoryName}`;

        return `${index + 1}. ${product.name} - ${formatCurrency(product.price)}${originalPrice}. Danh mục: ${categoryName}, ${stockLabel}${rating}. Gợi ý vì: ${reason}.`;
    }).join('\n');

const getProductReply = async (message, intent) => {
    const productContext = await findRelevantProducts(message, intent);

    if (productContext.lookupFailed) {
        return 'Mình chưa thể tải dữ liệu sản phẩm lúc này. Bạn có thể thử lại sau hoặc tìm trực tiếp trong trang Sản phẩm.';
    }

    if (!productContext.products.length) {
        return 'Mình chưa tìm thấy sản phẩm phù hợp trong cửa hàng. Bạn có thể thử từ khóa khác như "thức ăn cho mèo", "đồ chơi cho chó" hoặc "sản phẩm giảm giá".';
    }

    const prefix = intent.sale
        ? 'Mình tìm thấy một số sản phẩm đang có giá tốt trong PetMart:\n'
        : 'Mình gợi ý một vài sản phẩm có trong PetMart:\n';

    return `${prefix}${formatProductRecommendations(productContext.products)}\nBạn có thể mở trang sản phẩm để xem hình ảnh, mô tả chi tiết và thêm vào giỏ hàng.`;
};

const getRequestedOrderCode = (message) => {
    const objectId = message.match(/[a-f\d]{24}/i)?.[0];
    if (objectId) return objectId;

    const shortCode = message.match(/#?\b[a-z0-9]{6,12}\b/i)?.[0]?.replace('#', '');
    return shortCode || '';
};

const asksForOwnOrder = (message) => {
    const normalizedMessage = normalizeText(message);
    return /(cua toi|cua minh|don toi|don minh|gan nhat|ma don|#|order)/.test(normalizedMessage)
        || Boolean(message.match(/[a-f\d]{24}/i));
};

const findOrdersForUser = async ({ userId, requestedCode }) => {
    if (requestedCode && mongoose.isValidObjectId(requestedCode)) {
        return Order.find({ _id: requestedCode, user: userId })
            .select('orderItems totalPrice status paymentMethod isPaid createdAt cancelStatus cancelRequested cancelRequestedAt')
            .sort({ createdAt: -1 })
            .limit(1)
            .lean();
    }

    const orders = await Order.find({ user: userId })
        .select('orderItems totalPrice status paymentMethod isPaid createdAt cancelStatus cancelRequested cancelRequestedAt')
        .sort({ createdAt: -1 })
        .limit(ORDER_LIMIT)
        .lean();

    if (!requestedCode) return orders;

    const normalizedCode = requestedCode.toLowerCase();
    return orders.filter((order) => String(order._id).toLowerCase().endsWith(normalizedCode));
};

const getOrderDisplayCode = (order) => `#${String(order._id).slice(-8).toUpperCase()}`;

const getCancellationGuidance = (order) => {
    if (order.cancelStatus === 'pending' || order.cancelRequested) {
        return 'Yêu cầu hủy của đơn này đang chờ admin xử lý.';
    }

    if (CANCELLABLE_STATUSES.includes(order.status)) {
        return 'Đơn này còn có thể gửi yêu cầu hủy. Bạn mở chi tiết đơn hàng và chọn "Yêu cầu hủy đơn"; PetMart sẽ kiểm tra trước khi cập nhật trạng thái.';
    }

    return 'Đơn này không thể yêu cầu hủy ở trạng thái hiện tại.';
};

const formatOrderSummary = (order) => {
    const items = (order.orderItems || [])
        .slice(0, 3)
        .map((item) => `${item.name || 'Sản phẩm'} x${item.qty}`)
        .join(', ');
    const paymentMethod = PAYMENT_LABELS[String(order.paymentMethod || '').toLowerCase()] || order.paymentMethod || 'Chưa rõ';

    return [
        `${getOrderDisplayCode(order)}: ${ORDER_STATUS_LABELS[order.status] || order.status}`,
        `Tổng tiền ${formatCurrency(order.totalPrice)}`,
        `Thanh toán: ${paymentMethod}`,
        order.isPaid ? 'đã thanh toán' : 'chưa thanh toán',
        items ? `Sản phẩm: ${items}` : null,
        getCancellationGuidance(order),
    ].filter(Boolean).join('. ');
};

const getOrderStatusGuide = () =>
    [
        'Các trạng thái đơn hàng thường gặp tại PetMart:',
        '- Chờ xác nhận: PetMart đã nhận đơn và đang kiểm tra.',
        '- Đang xử lý: đơn đang được chuẩn bị.',
        '- Đang giao: đơn đã bàn giao cho đơn vị vận chuyển.',
        '- Đã giao: đơn đã hoàn tất giao hàng.',
        '- Đã hủy: đơn đã được hủy.',
        '- Yêu cầu hủy: khách đã gửi yêu cầu hủy và đang chờ xử lý.',
    ].join('\n');

const getOrderReply = async (message, user, intent) => {
    if (!asksForOwnOrder(message) && !intent.cancel) {
        return getOrderStatusGuide();
    }

    if (!user?._id) {
        return 'Bạn vui lòng đăng nhập để mình kiểm tra đơn hàng thuộc tài khoản của bạn. Mình không thể xem đơn hàng khi chưa xác thực tài khoản.';
    }

    try {
        const requestedCode = getRequestedOrderCode(message);
        const orders = await findOrdersForUser({ userId: user._id, requestedCode });

        if (!orders.length) {
            return requestedCode
                ? 'Mình không tìm thấy đơn hàng phù hợp trong tài khoản hiện tại. Vui lòng kiểm tra lại mã đơn hoặc mở trang Đơn hàng của bạn.'
                : 'Tài khoản hiện tại chưa có đơn hàng nào để kiểm tra.';
        }

        const title = requestedCode ? 'Mình tìm thấy đơn hàng này trong tài khoản của bạn:' : 'Các đơn hàng gần đây của bạn:';
        return `${title}\n${orders.map(formatOrderSummary).join('\n')}`;
    } catch {
        return 'Mình chưa thể tải đơn hàng lúc này. Bạn vui lòng thử lại sau hoặc mở trang Đơn hàng để kiểm tra.';
    }
};

const getStaticReply = (intent) => {
    if (intent.greeting) {
        return 'Xin chào! Mình là trợ lý PetMart. Mình có thể hỗ trợ bạn tìm sản phẩm, hướng dẫn đặt hàng, thanh toán, kiểm tra đơn hàng hoặc hỗ trợ tài khoản.';
    }

    if (intent.unsafe) {
        return 'Mình không thể cung cấp API key, token, mật khẩu, biến môi trường, mã nguồn nội bộ hoặc dữ liệu riêng tư. Mình có thể hỗ trợ các câu hỏi mua sắm và chăm sóc khách hàng tại PetMart.';
    }

    if (intent.health) {
        return 'Mình có thể gợi ý sản phẩm chăm sóc thú cưng, nhưng không thể chẩn đoán bệnh chắc chắn. Nếu thú cưng có dấu hiệu bất thường như bỏ ăn, nôn, tiêu chảy hoặc sốt, bạn nên liên hệ bác sĩ thú y sớm.';
    }

    if (intent.cart) {
        return 'Để dùng giỏ hàng, bạn mở sản phẩm muốn mua, chọn số lượng rồi bấm thêm vào giỏ. Trong trang Giỏ hàng, bạn có thể đổi số lượng, xóa sản phẩm và chuyển sang thanh toán.';
    }

    if (intent.payment) {
        return 'PetMart hỗ trợ COD và VNPay. COD là thanh toán khi nhận hàng; VNPay là thanh toán trực tuyến qua cổng VNPay. Với đơn đã thanh toán, việc hủy/hoàn tiền cần được admin kiểm tra theo chính sách xử lý đơn.';
    }

    if (intent.checkout) {
        return 'Để đặt hàng, bạn kiểm tra giỏ hàng, nhập địa chỉ và số điện thoại giao hàng, chọn phương thức thanh toán COD hoặc VNPay, rồi xác nhận đặt hàng. Sau đó bạn có thể theo dõi trạng thái trong mục Đơn hàng.';
    }

    if (intent.cancel) {
        return 'Bạn có thể gửi yêu cầu hủy khi đơn đang ở trạng thái Chờ xác nhận hoặc Đang xử lý. Hãy mở chi tiết đơn hàng và chọn "Yêu cầu hủy đơn". Nếu đơn đang giao, đã giao hoặc đã hủy thì không thể gửi yêu cầu hủy.';
    }

    if (intent.forgotPassword) {
        return 'Nếu quên mật khẩu, bạn vào trang Quên mật khẩu, nhập tên đăng nhập và email đã đăng ký, nhận mã OTP, xác minh mã còn hạn rồi đặt mật khẩu mới.';
    }

    if (intent.account) {
        return 'Bạn có thể đăng ký tài khoản bằng email, xác minh OTP, sau đó đăng nhập để mua hàng, lưu yêu thích, quản lý giỏ hàng và theo dõi đơn. Nếu không đăng nhập được, hãy thử Quên mật khẩu.';
    }

    if (intent.warranty) {
        return 'Với đổi trả, bảo hành hoặc khiếu nại, bạn nên giữ mã đơn và hình ảnh sản phẩm nếu có. PetMart sẽ kiểm tra tình trạng đơn/sản phẩm trước khi hỗ trợ đổi trả hoặc xử lý bảo hành.';
    }

    return null;
};

export const generateChatbotReply = async ({ message, user }) => {
    const intent = detectIntent(message);

    if (intent.unsafe) {
        const staticReply = getStaticReply(intent);
        return {
            status: 200,
            body: {
                success: true,
                reply: staticReply,
                data: { reply: staticReply },
            },
        };
    }

    let reply;

    if (intent.product) {
        reply = await getProductReply(message, intent);
    } else if (intent.cancel && !asksForOwnOrder(message)) {
        reply = getStaticReply(intent);
    } else if (intent.order || intent.cancel) {
        reply = await getOrderReply(message, user, intent);
    } else {
        reply = getStaticReply(intent)
            || 'Mình chưa hiểu rõ câu hỏi của bạn. Bạn có thể hỏi về sản phẩm, đơn hàng, thanh toán hoặc tài khoản.';
    }

    return {
        status: 200,
        body: {
            success: true,
            reply,
            data: { reply },
        },
    };
};
