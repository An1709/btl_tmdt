import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Category from '../models/Category.js';
import Post from '../models/Post.js';
import Cart from '../models/Cart.js';
import Collection from '../models/Collection.js';

const MAX_MESSAGE_LENGTH = 2000;
const PRODUCT_LIMIT = 3;
const ORDER_LIMIT = 5;
const PRODUCT_SELECT_FIELDS = 'name slug price originalPrice stock sold views description category averageRating reviewCount specifications';

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
        // Species terms (normalized Vietnamese + English) — 'cho' must be here so
        // a bare "chó" message always triggers product intent.
        'cho', 'cun', 'cat', 'dog', 'kitten', 'puppy', 'tho', 'rabbit', 'hamster', 'vet',
        'chim', 'bird', 'parrot', 'ca', 'fish', 'aquarium', 'giam gia',
        'khuyen mai', 'sale',
    ],
    blog: ['blog', 'bai viet', 'article', 'tin tuc', 'news', 'meo cham soc', 'kinh nghiem', 'tips', 'huong dan cham soc', 'cham soc thu cung'],
    about: ['petmart la gi', 'trang web nay la gi', 'web nay la gi', 'shop ban gi', 'shop ban nhung gi', 'gioi thieu', 've cua hang', 'web nay co gi', 'cua hang nay', 'website nay'],
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
    // NOTE: Do NOT include food/accessory terms in species synonyms (meo/cho/tho…)
    // to avoid leaking support products into animal listing recommendations.
    meo: ['mèo', 'meo', 'cat', 'kitten', 'mèo con'],
    cho: ['chó', 'cho', 'dog', 'puppy', 'cún', 'cún con'],
    tho: ['thỏ', 'tho', 'rabbit', 'bunny'],
    hamster: ['hamster', 'chuột hamster'],
    vet: ['vẹt', 'vet', 'chim', 'bird', 'parrot'],
    ca: ['cá', 'ca', 'fish', 'aquarium', 'bể cá', 'thủy sinh'],
    con: ['con', 'nhỏ', 'baby', 'kitten', 'puppy', 'sơ sinh'],
    thuc: ['thức ăn', 'thuc an', 'food', 'hạt', 'pate', 'dinh dưỡng'],
    phu: ['phụ kiện', 'phu kien', 'accessory', 'vòng cổ', 'dây dắt', 'đồ chơi'],
    choi: ['đồ chơi', 'do choi', 'toy', 'bóng', 'gặm'],
    long: ['lồng', 'chuồng', 'nệm', 'nhà'],
    vong: ['vòng cổ', 'vong co', 'dây dắt', 'day dat', 'leash', 'collar'],
    vesinh: ['cát vệ sinh', 'cat ve sinh', 'khay vệ sinh', 'khử mùi'],
    tam: ['tắm', 'sữa tắm', 'vệ sinh', 'khử mùi', 'chăm sóc', 'grooming'],
};

const PET_CATEGORY_TERMS = {
    dog: ['cho', 'dog', 'puppy', 'cun'],
    cat: ['meo', 'cat', 'kitten'],
    rabbit: ['tho', 'rabbit', 'bunny', 'lionhead', 'mini lop', 'netherland dwarf', 'ha lan lun'],
    hamster: ['hamster'],
    parrot: ['vet', 'chim', 'bird', 'parrot'],
    fish: ['ca', 'fish', 'aquarium', 'thuy sinh'],
    accessory: ['phu kien', 'accessory', 'accessories'],
};

const RABBIT_ANIMAL_TERMS = ['tho', 'rabbit', 'bunny', 'lionhead', 'mini lop', 'netherland dwarf', 'ha lan lun'];
const FISH_EXCLUSION_TERMS = ['ca', 'fish', 'hong ket', 'be ca', 'be thuy sinh', 'aquarium'];

const PET_SPECIES = ['dog', 'cat', 'rabbit', 'hamster', 'parrot', 'fish'];

const DOG_BREED_TERMS = [
    // Full international breed names
    'american bulldog', 'american pit bull terrier', 'basset hound', 'beagle',
    'border collie', 'boxer', 'chihuahua', 'chow chow', 'cocker spaniel', 'dachshund',
    'doberman', 'english setter', 'german shorthaired', 'golden retriever',
    'great pyrenees', 'havanese', 'japanese chin', 'keeshond', 'labrador',
    'leonberger', 'maltese', 'miniature pinscher', 'newfoundland',
    'pomeranian', 'poodle', 'pug', 'rottweiler', 'saint bernard',
    'samoyed', 'scottish terrier', 'shiba inu', 'shiba', 'staffordshire bull terrier',
    'wheaten terrier', 'yorkshire terrier',
    // Common Vietnamese shorthands used in product names
    'alaska', 'bichon', 'becgie', 'bulldog', 'bull terrier',
    'corgi', 'golden', 'husky', 'pitbull', 'phoc soc', 'phoc',
];

const ACCESSORY_EXCLUSION_TERMS = [
    'thuc an', 'do an', 'hat', 'pate', 'vien thuong', 'banh thuong', 'treat', 'snack',
    'enzyme', 'vitamin', 'thuoc', 'thuc pham chuc nang', 'dinh duong',
    'ao', 'quan ao', 'vong co', 'day dat', 'ro mom', 'chuong', 'long', 'dem', 'nem',
    'bat an', 'do choi', 'sua tam', 'dau goi', 'luoc', 'phu kien', 'vat dung', 'do dung',
    'trang thiet bi', 'vat tu', 'san pham ho tro',
];

const STRONG_ACCESSORY_NAME_TERMS = [
    'thuc an', 'do an', 'hat', 'pate', 'snack', 'banh thuong', 'vien thuong',
    'sup thuong', 'treat', 'dentastix', 'thuoc', 'vitamin', 'enzyme', 'bo sung',
    'thuc pham', 'dinh duong', 'vong co', 'day dat', 'leash', 'collar',
    'chuong', 'long nuoi', 'nem', 'dem', 'o ngu', 'bat an', 'sua tam',
    'do choi', 'phu kien', 'ao', 'quan ao',
];

const FOOD_KIND_TERMS = ['thuc an', 'do an', 'hat', 'pate', 'snack', 'banh thuong', 'vien thuong', 'sup thuong', 'treat', 'dentastix', 'pellet', 'vien an'];
const SUPPLEMENT_KIND_TERMS = ['thuoc', 'vitamin', 'enzyme', 'dinh duong', 'thuc pham chuc nang', 'thuc pham bo sung', 'bo sung', 'men vi sinh', 'vien khop', 'khop', 'suc khoe', 'san pham ho tro'];
const EQUIPMENT_KIND_TERMS = ['be ca', 'bo be', 'be kinh', 'be thuy sinh', 'ho ca', 'aquarium', 'tank', 'may loc', 'loc nuoc', 'den led', 'den suoi', 'den', 'phan nen', 'thuy sinh', 'may cho an', 'can dien tu', 'tong do', 'may cat long'];

// Short single-word animal-listing signals used in Vietnamese dog product names.
// These supplement DOG_BREED_TERMS for the hasAnimalListingSignal check.
const DOG_ANIMAL_NAME_TERMS = [
    'samoyed', 'poodle', 'pug', 'husky', 'corgi', 'alaska', 'shiba',
    'golden', 'labrador', 'bichon', 'pomeranian', 'becgie', 'bulldog',
    'beagle', 'chihuahua', 'maltese', 'pitbull', 'rottweiler', 'doberman',
    'border', 'collie', 'retriever', 'phoc',
];

const CAT_BREED_TERMS = [
    'abyssinian', 'bengal', 'birman', 'bombay', 'british shorthair',
    'egyptian mau', 'maine coon', 'persian', 'ragdoll', 'russian blue',
    'siamese', 'sphynx',
];

const PRODUCT_TYPE_TERMS = [
    'phu kien', 'accessory', 'accessories', 'thuc an', 'food', 'do an',
    'hat', 'pate', 'sup thuong', 'snack', 'banh thuong', 'vien thuong',
    'treat', 'treats', 'reward', 'rewards', 'dentastix', 'do choi', 'toy', 'banh xe',
    'chuong', 'long nuoi', 'long chim', 'long vet', 'vong co', 'day dat', 'leash', 'collar', 'ao',
    'quan ao', 'cat ve sinh', 'khay ve sinh', 'bat an', 'sua tam', 'luoc',
    'thuoc', 'vitamin', 'dinh duong', 'cham soc', 've sinh', 'chat don', 'dem', 'o ngu',
    'o meo', 'nha', 'binh nuoc', 'balo', 'may cho an', 'tham ve sinh', 'be ca',
    'bo be', 'be kinh', 'be thuy sinh', 'ho ca', 'aquarium', 'tank',
    'may loc', 'loc nuoc', 'den led', 'den suoi', 'den', 'phan nen', 'thuy sinh', 'can dien tu',
    'linh kien', 'vat dung', 'do dung', 'trang thiet bi', 'vat tu',
    'san pham ho tro', 'thuc pham chuc nang', 'thuc pham bo sung',
    'bo sung', 'enzyme', 'men vi sinh', 'vien khop', 'khop', 'suc khoe',
];

const RAW_ACCESSORY_TERMS = [
    'phụ kiện', 'đồ chơi', 'thức ăn', 'hạt', 'pate', 'súp thưởng',
    'bánh thưởng', 'viên thưởng',
    'chuồng', 'lồng', 'dây dắt', 'vòng cổ', 'áo', 'quần áo',
    'cát vệ sinh', 'khay vệ sinh', 'bát ăn', 'sữa tắm', 'lược',
    'thuốc', 'vitamin', 'đệm', 'ổ', 'nhà', 'bình nước',
    'bể', 'bể cá', 'bể thủy sinh', 'máy lọc', 'đèn',
    'linh kiện', 'vật dụng', 'đồ dùng', 'trang thiết bị', 'vật tư',
    'sản phẩm hỗ trợ', 'thực phẩm chức năng', 'thực phẩm bổ sung',
    'bổ sung', 'enzyme', 'men vi sinh', 'viên khớp', 'khớp', 'sức khỏe', 'dinh dưỡng',
];

const BREED_ALIASES = {
    'british shorthair': ['mèo anh lông ngắn', 'meo anh long ngan', 'anh long ngan'],
    'russian blue': ['mèo nga xanh', 'meo nga xanh', 'nga xanh'],
    'maine coon': ['mèo maine coon', 'meo maine coon'],
    'scottish terrier': ['scottish'],
    'staffordshire bull terrier': ['staffordshire'],
};

const SPECIES_LABELS = {
    dog: 'chó',
    cat: 'mèo',
    rabbit: 'thỏ',
    hamster: 'hamster',
    parrot: 'vẹt',
    fish: 'cá',
};

const ANIMAL_RECOMMENDATION_LABELS = {
    dog: 'bé chó',
    cat: 'bé mèo',
    rabbit: 'bé thỏ',
    hamster: 'bé hamster',
    parrot: 'bé vẹt',
    fish: 'cá cảnh',
};

const SUPPORT_PRODUCT_GROUPS = [
    {
        intentTerms: ['thuc an', 'do an', 'food', 'hat', 'pate', 'snack', 'banh thuong', 'vien thuong', 'co kho'],
        productTerms: ['thuc an', 'do an', 'food', 'hat', 'pate', 'snack', 'banh thuong', 'vien thuong', 'treat', 'treats', 'reward', 'rewards', 'dentastix', 'co kho', 'timothy hay', 'pellet', 'vien an'],
    },
    {
        intentTerms: ['thuoc', 'vitamin', 'enzyme', 'dinh duong', 'thuc pham chuc nang', 'thuc pham bo sung', 'san pham ho tro'],
        productTerms: ['thuoc', 'vitamin', 'enzyme', 'dinh duong', 'thuc pham chuc nang', 'thuc pham bo sung', 'bo sung', 'men vi sinh', 'vien khop', 'khop', 'suc khoe'],
    },
    {
        intentTerms: ['chuong', 'long', 'long nuoi', 'long chim', 'long vet', 'nha'],
        productTerms: ['chuong', 'long', 'long nuoi', 'long chim', 'long vet', 'nha'],
    },
    {
        intentTerms: ['do choi', 'toy'],
        productTerms: ['do choi', 'toy', 'gam', 'bong', 'foraging'],
    },
    {
        intentTerms: ['cat ve sinh', 'khay ve sinh', 've sinh', 'chat don'],
        productTerms: ['cat ve sinh', 'khay ve sinh', 've sinh', 'chat don', 'khu mui'],
    },
    {
        intentTerms: ['vong co', 'day dat', 'leash', 'collar', 'ao', 'quan ao'],
        productTerms: ['vong co', 'day dat', 'leash', 'collar', 'ao', 'quan ao'],
    },
    {
        intentTerms: ['be', 'be ca', 'bo be', 'be kinh', 'be thuy sinh', 'ho ca', 'aquarium', 'tank', 'may loc', 'loc nuoc', 'den', 'den led', 'den suoi', 'phan nen', 'thuy sinh'],
        productTerms: ['be ca', 'bo be', 'be kinh', 'be thuy sinh', 'ho ca', 'aquarium', 'tank', 'may loc', 'loc nuoc', 'den', 'den led', 'den suoi', 'phan nen', 'thuy sinh'],
    },
];

const hasProductTypeIntent = (message) => {
    const normalizedMessage = normalizeText(message);
    const rawMessage = String(message || '').toLowerCase();
    return PRODUCT_TYPE_TERMS.some((term) => normalizedMessage.includes(term))
        || RAW_ACCESSORY_TERMS.some((term) => rawMessage.includes(term));
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

const hasTerm = (text, term) =>
    new RegExp(`\\b${escapeRegex(term)}\\b`).test(text);

const hasDogPurchaseContext = (normalizedMessage) =>
    /\b(can|muon|tim|mua|goi y|tu van|san pham|do|thuc an|phu kien)\b.*\bcho\b/.test(normalizedMessage)
    || /\bcho\b.*\b(can|muon|tim|mua|goi y|tu van|san pham|do|thuc an|phu kien)\b/.test(normalizedMessage);

const parsePriceAmount = (numberText, unitText = '') => {
    const normalizedNumber = String(numberText || '').replace(',', '.');
    const value = Number(normalizedNumber);
    const unit = normalizeText(unitText);

    if (!Number.isFinite(value) || value <= 0) return 0;
    if (['trieu', 'tr'].includes(unit)) return Math.round(value * 1000000);
    if (['k', 'nghin', 'ngan'].includes(unit)) return Math.round(value * 1000);
    if (value < 1000 && unit) return Math.round(value * 1000);
    return Math.round(value);
};

const parsePriceIntent = (message) => {
    const normalizedMessage = normalizeText(message).replace(/\s+/g, ' ');
    const amountMatch = normalizedMessage.match(/(\d+(?:[.,]\d+)?)\s*(trieu|tr|nghin|ngan|k)?\b/);
    const unitText = amountMatch?.[2] || '';
    let amount = amountMatch ? parsePriceAmount(amountMatch[1], unitText) : 0;
    const isCheap = /\b(re|gia re|binh dan|tiet kiem)\b/.test(normalizedMessage);
    const isPremium = /\b(dat|cao cap|xin|tot nhat|gia cao)\b/.test(normalizedMessage);
    const isBelow = /\b(duoi|nho hon|khong qua|toi da|<=)\b/.test(normalizedMessage);
    const isAbove = /\b(tren|lon hon|tu|>=)\b/.test(normalizedMessage);
    const isAround = /\b(khoang|tam|tam gia|gan)\b/.test(normalizedMessage);
    const hasPriceContext = /\b(gia|duoi|nho hon|khong qua|toi da|tren|lon hon|tu|khoang|tam|tam gia|gan|re|dat|cao cap|nghin|ngan|trieu)\b/.test(normalizedMessage);

    if (amount && !unitText && amount < 10000 && !hasPriceContext) {
        amount = 0;
    }

    if (!amount && !isCheap && !isPremium) {
        return { hasPriceIntent: false };
    }

    if (amount && isBelow) {
        return { hasPriceIntent: true, maxPrice: amount, sort: isCheap ? 'price_asc' : 'relevance' };
    }

    if (amount && isAbove) {
        return { hasPriceIntent: true, minPrice: amount, sort: isPremium ? 'premium' : 'relevance' };
    }

    if (amount && (isAround || !isBelow && !isAbove)) {
        const range = Math.round(amount * 0.2);
        return {
            hasPriceIntent: true,
            minPrice: Math.max(amount - range, 0),
            maxPrice: amount + range,
            targetPrice: amount,
            sort: 'near_price',
        };
    }

    return {
        hasPriceIntent: true,
        sort: isPremium ? 'premium' : 'price_asc',
    };
};

const detectIntent = (message) => {
    const normalizedMessage = normalizeText(message);
    const priceIntent = parsePriceIntent(message);

    const intent = Object.fromEntries(
        Object.entries(INTENT_KEYWORDS).map(([intent, keywords]) => [
            intent,
            hasAnyKeyword(normalizedMessage, keywords),
        ]),
    );

    intent.product = intent.product
        || /\b(chó|mèo|thỏ|vẹt|chim|cá|hamster)\b/i.test(message)
        || /\b(cho|cun|meo|tho|vet|chim|ca|hamster|dog|cat|rabbit|bird|parrot|fish|aquarium)\b/.test(normalizedMessage)
        || DOG_BREED_TERMS.some((breed) => normalizedMessage.includes(breed))
        || CAT_BREED_TERMS.some((breed) => normalizedMessage.includes(breed))
        || hasDogPurchaseContext(normalizedMessage)
        || priceIntent.hasPriceIntent;

    intent.order = intent.order
        || /\b(don.*cua toi|don.*cua minh|toi co don|don nao|dang giao|da mua gi|toi da mua|lich su mua)\b/.test(normalizedMessage);

    intent.price = priceIntent.hasPriceIntent;

    return intent;
};

const formatCurrency = (amount) =>
    Number(amount || 0).toLocaleString('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    });

const formatDateTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    return date.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
};

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
    if (DOG_BREED_TERMS.some((breed) => normalizedMessage.includes(breed))) return 'dog';
    if (CAT_BREED_TERMS.some((breed) => normalizedMessage.includes(breed))) return 'cat';
    if (/\b(mèo|meo|cat|kitten)\b/i.test(message) || /\b(meo|cat|kitten)\b/.test(normalizedMessage)) return 'cat';
    if (/\b(thỏ|rabbit|bunny)\b/i.test(message) || /\b(tho|rabbit|bunny)\b/.test(normalizedMessage)) return 'rabbit';
    if (/\bhamster\b/i.test(message) || /\bhamster\b/.test(normalizedMessage)) return 'hamster';
    if (/\b(vẹt|chim|bird|parrot)\b/i.test(message) || /\b(vet|chim|bird|parrot)\b/.test(normalizedMessage)) return 'parrot';
    if (/\b(cá|fish|aquarium)\b/i.test(message) || /\b(ca|fish|aquarium|thuy sinh)\b/.test(normalizedMessage)) return 'fish';
    if (
        /\b(chó|dog|puppy|cún|cún con)\b/i.test(message)
        || /\b(cho|cun|dog|puppy)\b/.test(normalizedMessage)
        || hasDogPurchaseContext(normalizedMessage)
    ) return 'dog';
    if (/\b(phụ kiện|accessory|accessories)\b/i.test(message) || /\b(phu kien|accessory|accessories)\b/.test(normalizedMessage)) return 'accessory';
    return '';
};

const hasAccessoryIntent = (message) => {
    const normalizedMessage = normalizeText(message);
    const rawMessage = String(message || '').toLowerCase();
    return PRODUCT_TYPE_TERMS.some((term) => hasTerm(normalizedMessage, term))
        || RAW_ACCESSORY_TERMS.some((term) => rawMessage.includes(term));
};

const getBreedAliases = (breed) => [breed, ...(BREED_ALIASES[breed] || [])];

const getRequestedBreedContext = (message) => {
    const normalizedMessage = normalizeText(message);
    const matches = [...DOG_BREED_TERMS, ...CAT_BREED_TERMS]
        .map((breed) => {
            const aliases = getBreedAliases(breed).map((alias) => normalizeText(alias));
            return {
                breed,
                aliases,
                matched: aliases.some((alias) => hasTerm(normalizedMessage, alias)),
            };
        })
        .filter(({ matched }) => matched);

    return {
        label: matches[0]?.breed || '',
        terms: [...new Set(matches.flatMap(({ breed, aliases }) => [breed, ...aliases]))],
    };
};

const hasBreedIntent = (message) => getRequestedBreedContext(message).terms.length > 0;

const productMatchesBreed = (product, breedTerms) => {
    if (!breedTerms.length) return true;
    const searchText = getProductSearchText(product);
    return breedTerms.some((breed) => hasTerm(searchText, normalizeText(breed)));
};

const getSpeciesTermsPattern = () =>
    PET_SPECIES.flatMap((species) => PET_CATEGORY_TERMS[species] || [])
        .map(escapeRegex)
        .join('|');

// Product intent must be decided before ranking, otherwise cheap accessories
// with species words can outrank actual pet listings for "mua chó/mèo".
const detectChatbotProductIntent = (message) => {
    if (hasAccessoryIntent(message)) return 'ACCESSORY_PURCHASE';

    const species = getPetSpecies(message);

    if (hasBreedIntent(message) || (species && species !== 'accessory')) {
        return 'PET_PURCHASE';
    }

    return 'AMBIGUOUS';
};

const extractProductKeywords = (message, intent) => {
    const ignoredWords = new Set([
        'toi', 'minh', 'ban', 'can', 'muon', 'tim', 'cho', 'mua', 'hang',
        'san', 'pham', 'goi', 'tu', 'van', 'petmart', 'co', 'khong',
        'gia', 'bao', 'nhieu', 'loai', 'nao', 'giup', 'mot', 'vai',
        'giam', 'khuyen', 'mai', 'sale', 'uu', 'dai', 'dang', 'gi', 'hay',
        'duoi', 'tren', 'nho', 'lon', 'hon', 'khong', 'qua', 'toi', 'da',
        'tam', 'khoang', 'gan', 'nghin', 'ngan', 'trieu', 're', 'dat',
        'cao', 'cap', 'tot', 'nhat',
    ]);

    const normalizedWords = normalizeText(message)
        .split(/[^a-z0-9]+/)
        .map((word) => word.trim())
        .filter((word) => word.length >= 2 && !ignoredWords.has(word) && !/^\d+k?$/.test(word));

    const rawWords = getRawTerms(message)
        .filter((word) => word.length >= 2)
        .filter((word) => !/^\d+[kK]?$/.test(word))
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

const hasSpecificProductSignal = (message, intent) => {
    if (intent.sale || intent.price || getPetSpecies(message)) return true;
    return extractProductKeywords(message, intent).length > 0;
};

const buildBaseProductFilters = (intent, priceIntent) => {
    const filters = [];

    if (intent.sale) {
        filters.push({ originalPrice: { $exists: true, $gt: 0 } });
        filters.push({ $expr: { $gt: ['$originalPrice', '$price'] } });
    }

    if (priceIntent?.minPrice) {
        filters.push({ price: { $gte: priceIntent.minPrice } });
    }

    if (priceIntent?.maxPrice) {
        filters.push({ price: { $lte: priceIntent.maxPrice } });
    }

    return filters;
};

const buildProductFilter = async (message, intent, keywords) => {
    const priceIntent = parsePriceIntent(message);
    const filters = buildBaseProductFilters(intent, priceIntent);
    const textKeywords = intent.sale
        ? keywords.filter((keyword) => !['sale', 'giam', 'gia', 'giam gia', 'khuyen', 'mai', 'khuyen mai', 'uu', 'dai', 'uu dai'].includes(normalizeText(keyword)))
        : keywords;

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
            ...regexes.map((regex) => ({ 'specifications.Giống': regex })),
            ...regexes.map((regex) => ({ 'specifications.Loại': regex })),
            ...regexes.map((regex) => ({ 'specifications.Dành cho': regex })),
            ...(categories.length ? [{ category: { $in: categories.map((category) => category._id) } }] : []),
        ],
    });

    const speciesTerms = [];
    const petSpecies = getPetSpecies(message);
    if (petSpecies && PET_CATEGORY_TERMS[petSpecies]) {
        speciesTerms.push(...PET_CATEGORY_TERMS[petSpecies]);
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
                ...speciesRegexes.map((regex) => ({ 'specifications.Giống': regex })),
                ...speciesRegexes.map((regex) => ({ 'specifications.Loại': regex })),
                ...speciesRegexes.map((regex) => ({ 'specifications.Dành cho': regex })),
                ...(speciesCategories.length ? [{ category: { $in: speciesCategories.map((category) => category._id) } }] : []),
            ],
        });
    }

    return { $and: filters };
};

const getCategoryName = (category) => {
    if (!category) return '';
    if (typeof category === 'string') return category;
    return category.name || category.slug || '';
};

const getCategorySlug = (category) => {
    if (!category || typeof category === 'string') return '';
    return category.slug || '';
};

const getCategorySearchText = (category) => {
    if (!category) return '';
    if (typeof category === 'string') return category;
    return [category.name, category.slug, category.description].filter(Boolean).join(' ');
};

const getProductSearchText = (product) => normalizeText([
    product.name,
    product.description,
    getCategorySearchText(product.category),
    formatSpecifications(product.specifications),
].filter(Boolean).join(' '));

const getRequestedSupportProductGroup = (message) => {
    const normalizedMessage = normalizeText(message);
    return SUPPORT_PRODUCT_GROUPS.find((group) =>
        group.intentTerms.some((term) => hasTerm(normalizedMessage, term)),
    );
};

const productMatchesSupportGroup = (product, supportGroup) => {
    if (!supportGroup) return true;
    const searchText = getProductSearchText(product);
    return supportGroup.productTerms.some((term) => hasTerm(searchText, term));
};

const hasAnyTerm = (text, terms) => terms.some((term) => hasTerm(text, term));

const productHasFishSignal = (product) => {
    const productName = normalizeText(product.name);
    const categoryName = normalizeText(getCategoryName(product.category));
    const categorySlug = normalizeText(getCategorySlug(product.category));
    const searchText = getProductSearchText(product);

    return categorySlug === 'fish'
        || hasTerm(categoryName, 'ca')
        || hasAnyTerm(productName, FISH_EXCLUSION_TERMS)
        || hasAnyTerm(searchText, ['hong ket', 'fish', 'be ca', 'be thuy sinh', 'aquarium']);
};

const productHasRabbitSignal = (product) => {
    const productName = normalizeText(product.name);
    const categoryName = normalizeText(getCategoryName(product.category));
    const categorySlug = normalizeText(getCategorySlug(product.category));
    const searchText = getProductSearchText(product);

    return categorySlug === 'rabbit'
        || hasTerm(categoryName, 'tho')
        || hasAnyTerm(productName, RABBIT_ANIMAL_TERMS)
        || hasAnyTerm(searchText, ['lionhead', 'mini lop', 'netherland dwarf', 'ha lan lun']);
};

// A product is a dog/cat/rabbit animal listing if:
// (a) its name explicitly starts with or contains a breed name, OR
// (b) its NORMALIZED name STARTS WITH "chó/cún" (Vietnamese dog listing pattern),
//     e.g. "Chó Poodle", "Cún Samoyed" — NOT mid-name occurrences like "Tông Đơ Chó".
// (c) its name contains one of the known short breed aliases.
const hasAnimalListingSignal = (text) =>
    DOG_BREED_TERMS.some((breed) => text.includes(breed))
    || CAT_BREED_TERMS.some((breed) => text.includes(breed))
    || /^(cho|cun)\s+[a-z]/.test(text)
    || DOG_ANIMAL_NAME_TERMS.some((term) => new RegExp(`\\b${escapeRegex(term)}\\b`).test(text))
    || /\b(meo|kitten|tho|rabbit|hamster|parrot|fish)\b/.test(text)
    || /\b(chuot hamster|hamster\s+(abino|bo sua|tra sua|campell|syrian|dwarf))\b/.test(text);

const getProductClassificationTexts = (product) => {
    const name = normalizeText(product.name);
    const category = normalizeText(getCategoryName(product.category));
    const categorySlug = normalizeText(getCategorySlug(product.category));
    const description = normalizeText(product.description);
    const specifications = normalizeText(formatSpecifications(product.specifications));
    const nameCategorySpecs = normalizeText([product.name, getCategoryName(product.category), formatSpecifications(product.specifications)].filter(Boolean).join(' '));

    return {
        name,
        category,
        categorySlug,
        description,
        specifications,
        nameCategorySpecs,
        fullText: normalizeText(getProductSearchText(product)),
    };
};

const textHasAnyTerm = (text, terms) => terms.some((term) => hasTerm(text, term));

const nameHasDogListingPattern = (name) =>
    /^(cho|cun)\s+[a-z]/.test(name)
    || DOG_BREED_TERMS.some((breed) => name.includes(breed))
    || DOG_ANIMAL_NAME_TERMS.some((term) => hasTerm(name, term));

const textsHaveDogBreedSignal = (texts) =>
    nameHasDogListingPattern(texts.name)
    || DOG_BREED_TERMS.some((breed) => texts.specifications.includes(breed))
    || DOG_ANIMAL_NAME_TERMS.some((term) => hasTerm(texts.specifications, term));

const hasAccessoryExclusionSignal = (texts, { includeDescription = false } = {}) => {
    if (textHasAnyTerm(texts.nameCategorySpecs, ACCESSORY_EXCLUSION_TERMS)) {
        return true;
    }

    return includeDescription && textHasAnyTerm(texts.description, ACCESSORY_EXCLUSION_TERMS);
};

const detectProductSpecies = (texts) => {
    if (texts.categorySlug === 'dog' || textsHaveDogBreedSignal(texts) || hasTerm(texts.nameCategorySpecs, 'cho') || hasTerm(texts.nameCategorySpecs, 'cun')) {
        return 'dog';
    }

    if (texts.categorySlug === 'cat'
        || CAT_BREED_TERMS.some((breed) => texts.fullText.includes(breed))
        || hasTerm(texts.nameCategorySpecs, 'meo')
        || hasTerm(texts.nameCategorySpecs, 'kitten')) {
        return 'cat';
    }

    if (productHasRabbitSignal({ name: texts.name, description: texts.description, category: { name: texts.category, slug: texts.categorySlug }, specifications: texts.specifications })) {
        return 'rabbit';
    }

    if (texts.categorySlug === 'hamster' || hasTerm(texts.fullText, 'hamster')) {
        return 'hamster';
    }

    if (texts.categorySlug === 'parrot' || /\b(vet|chim|bird|parrot)\b/.test(texts.fullText)) {
        return 'parrot';
    }

    if (texts.categorySlug === 'fish' || productHasFishSignal({ name: texts.name, description: texts.description, category: { name: texts.category, slug: texts.categorySlug }, specifications: texts.specifications })) {
        return 'fish';
    }

    return 'unknown';
};

const isDogAnimalListing = (texts) => {
    if (textHasAnyTerm(texts.name, STRONG_ACCESSORY_NAME_TERMS)) {
        return false;
    }

    if (textsHaveDogBreedSignal(texts) && !textHasAnyTerm(texts.name, STRONG_ACCESSORY_NAME_TERMS)) {
        return true;
    }

    if (texts.categorySlug === 'dog' && /^(cho|cun)\b/.test(texts.name) && !textHasAnyTerm(texts.name, STRONG_ACCESSORY_NAME_TERMS)) {
        return true;
    }

    return false;
};

const isCatAnimalListing = (texts) => {
    if (textHasAnyTerm(texts.name, STRONG_ACCESSORY_NAME_TERMS)) {
        return false;
    }

    if (CAT_BREED_TERMS.some((breed) => texts.name.includes(breed) || texts.specifications.includes(breed))) {
        return true;
    }

    if (!textHasAnyTerm(texts.name, STRONG_ACCESSORY_NAME_TERMS) && hasAnimalListingSignal(texts.name) && /\b(meo|kitten)\b/.test(texts.name)) {
        return true;
    }

    return false;
};

const detectProductKind = (texts, species) => {
    if (species === 'dog' && isDogAnimalListing(texts)) {
        return { kind: 'animal', debugReason: 'dog breed/name listing pattern' };
    }

    if (species === 'cat' && isCatAnimalListing(texts)) {
        return { kind: 'animal', debugReason: 'cat breed/name listing pattern' };
    }

    if (species === 'rabbit' && productHasRabbitSignal({ name: texts.name, description: texts.description, category: { name: texts.category, slug: texts.categorySlug }, specifications: texts.specifications })
        && !productHasFishSignal({ name: texts.name, description: texts.description, category: { name: texts.category, slug: texts.categorySlug }, specifications: texts.specifications })
        && !hasAccessoryExclusionSignal(texts, { includeDescription: true })) {
        return { kind: 'animal', debugReason: 'rabbit listing signal' };
    }

    if ((species === 'hamster' || species === 'parrot' || species === 'fish')
        && PET_SPECIES.includes(species)
        && texts.categorySlug === species
        && !hasAccessoryExclusionSignal(texts, { includeDescription: true })
        && hasAnimalListingSignal(texts.fullText)) {
        return { kind: 'animal', debugReason: `${species} category listing signal` };
    }

    if (textHasAnyTerm(texts.nameCategorySpecs, FOOD_KIND_TERMS) || textHasAnyTerm(texts.description, FOOD_KIND_TERMS)) {
        return { kind: 'food', debugReason: 'food/support keyword' };
    }

    if (textHasAnyTerm(texts.nameCategorySpecs, SUPPLEMENT_KIND_TERMS) || textHasAnyTerm(texts.description, SUPPLEMENT_KIND_TERMS)) {
        return { kind: 'supplement', debugReason: 'supplement/support keyword' };
    }

    if (textHasAnyTerm(texts.nameCategorySpecs, EQUIPMENT_KIND_TERMS) || textHasAnyTerm(texts.description, EQUIPMENT_KIND_TERMS)) {
        return { kind: 'equipment', debugReason: 'equipment keyword' };
    }

    if (hasAccessoryExclusionSignal(texts, { includeDescription: true }) || textHasAnyTerm(texts.name, STRONG_ACCESSORY_NAME_TERMS)) {
        return { kind: 'accessory', debugReason: 'accessory/support keyword' };
    }

    if (PET_SPECIES.includes(texts.categorySlug) && hasAnimalListingSignal(texts.fullText)) {
        return { kind: 'animal', debugReason: 'species category animal signal' };
    }

    return { kind: 'unknown', debugReason: 'no confident kind match' };
};

export const classifyProduct = (product) => {
    const texts = getProductClassificationTexts(product);
    const species = detectProductSpecies(texts);
    const { kind, debugReason } = detectProductKind(texts, species);

    return {
        species,
        kind,
        reason: debugReason,
        debugReason,
    };
};

const productMatchesAnimalSpeciesStrictly = (product, species) => {
    if (species === 'rabbit') {
        return productHasRabbitSignal(product) && !productHasFishSignal(product);
    }

    if (species === 'dog') {
        const { species: detectedSpecies } = classifyProduct(product);
        return detectedSpecies === 'dog';
    }

    return productMatchesSpecies(product, species);
};

const productMatchesRecommendationIntent = (product, recommendationIntent, requestedSpecies = '') => {
    const classification = classifyProduct(product);

    if (recommendationIntent === 'PET_PURCHASE') {
        if (requestedSpecies && classification.species !== requestedSpecies) return false;
        return classification.kind === 'animal';
    }

    if (recommendationIntent === 'ACCESSORY_PURCHASE') {
        if (requestedSpecies && classification.species !== requestedSpecies && classification.species !== 'unknown') {
            return false;
        }
        return classification.kind !== 'animal';
    }

    return true;
};

const productMatchesSpecies = (product, species) => {
    if (!species) return true;
    const productName = normalizeText(product.name);
    const categoryName = normalizeText(getCategoryName(product.category));
    const categorySlug = normalizeText(getCategorySlug(product.category));
    const categoryText = `${categoryName} ${categorySlug}`.trim();
    const descriptiveText = normalizeText([product.description, formatSpecifications(product.specifications)].filter(Boolean).join(' '));

    if (categorySlug === species) {
        return true;
    }

    if (species === 'accessory') {
        return /\b(phu kien|accessory|accessories)\b/.test(categoryText)
            || /\b(phu kien|accessory|accessories)\b/.test(`${productName} ${descriptiveText}`);
    }

    const terms = PET_CATEGORY_TERMS[species] || [];
    const hasCategoryMatch = terms.some((term) => new RegExp(`\\b${escapeRegex(term)}\\b`).test(categoryText));

    if (hasCategoryMatch) {
        return true;
    }

    const searchableText = `${productName} ${descriptiveText}`;

    return terms.some((term) => {
        if (species === 'dog' && term === 'cho') {
            return /\b(cho|cun)\b/.test(categoryText)
                || /\b(dog|puppy|cun)\b/.test(searchableText)
                || /\b(thuc an|hat|pate|snack|do choi|vong co|day dat|ao|sua tam|cham soc|phu kien)\b.*\bcho\s+(cho|cun)\b/.test(searchableText);
        }

        return new RegExp(`\\b${escapeRegex(term)}\\b`).test(searchableText);
    });
};

const getProductMatchScore = (product, keywords) => {
    const searchText = getProductSearchText(product);
    const productName = normalizeText(product.name);
    const categoryName = normalizeText(getCategoryName(product.category));
    const ignoredRankingTerms = new Set([
        'meo', 'cat', 'kitten', 'cho', 'dog', 'puppy', 'cun', 'tho', 'rabbit',
        'hamster', 'vet', 'chim', 'bird', 'parrot', 'ca', 'fish', 'aquarium',
        'con', 'nho', 'baby',
    ]);

    return keywords.reduce((score, keyword) => {
        const normalizedKeyword = normalizeText(keyword);
        if (!normalizedKeyword || ignoredRankingTerms.has(normalizedKeyword)) return score;
        if (productName.includes(normalizedKeyword)) return score + 8;
        if (categoryName.includes(normalizedKeyword)) return score + 4;
        if (searchText.includes(normalizedKeyword)) return score + 2;
        return score;
    }, 0);
};

const sortProductsForSupport = (products, keywords, priceIntent = {}) =>
    [...products].sort((a, b) => {
        if (priceIntent.sort === 'price_asc') {
            const priceDelta = Number(a.price || 0) - Number(b.price || 0);
            if (priceDelta) return priceDelta;
        }

        if (priceIntent.sort === 'premium') {
            const ratingDelta = Number(b.averageRating || 0) - Number(a.averageRating || 0);
            if (ratingDelta) return ratingDelta;
            const priceDelta = Number(b.price || 0) - Number(a.price || 0);
            if (priceDelta) return priceDelta;
        }

        if (priceIntent.sort === 'near_price' && priceIntent.targetPrice) {
            const distanceDelta = Math.abs(Number(a.price || 0) - priceIntent.targetPrice)
                - Math.abs(Number(b.price || 0) - priceIntent.targetPrice);
            if (distanceDelta) return distanceDelta;
        }

        const relevanceScore = getProductMatchScore(b, keywords) - getProductMatchScore(a, keywords);
        if (relevanceScore) return relevanceScore;
        const stockScore = Number(b.stock > 0) - Number(a.stock > 0);
        if (stockScore) return stockScore;
        const ratingScore = Number(b.averageRating || 0) - Number(a.averageRating || 0);
        if (ratingScore) return ratingScore;
        return Number(b.sold || 0) - Number(a.sold || 0);
    });

const getIdString = (value) => String(value?._id || value || '');

const pushUniqueProducts = (target, products, limit = PRODUCT_LIMIT) => {
    const existingIds = new Set(target.map((product) => getIdString(product)));

    for (const product of products) {
        const productId = getIdString(product);
        if (!productId || existingIds.has(productId)) continue;

        target.push(product);
        existingIds.add(productId);
        if (target.length >= limit) break;
    }

    return target;
};

const getPopularProducts = async ({ excludeIds = new Set(), limit = PRODUCT_LIMIT } = {}) => {
    const excludedObjectIds = [...excludeIds].filter((id) => mongoose.isValidObjectId(id));
    const filter = excludedObjectIds.length ? { _id: { $nin: excludedObjectIds } } : {};

    return Product.find(filter)
        .populate('category', 'name slug')
        .select(PRODUCT_SELECT_FIELDS)
        .sort({ stock: -1, reviewCount: -1, averageRating: -1, sold: -1, views: -1, createdAt: -1 })
        .limit(limit)
        .lean();
};

const extractBehaviorSignals = (products) => {
    const categoryIds = new Set();
    const keywords = new Set();

    products.forEach((product) => {
        if (product.category?._id) categoryIds.add(getIdString(product.category._id));

        const searchText = getProductSearchText(product);
        const nameAndCategoryText = normalizeText([product.name, getCategorySearchText(product.category)].filter(Boolean).join(' '));
        if (/\bcho\b/.test(nameAndCategoryText)) {
            keywords.add('dog');
            keywords.add('puppy');
            keywords.add('cun');
        }

        Object.entries(PET_CATEGORY_TERMS).forEach(([species, terms]) => {
            if (terms.some((term) => searchText.includes(term))) {
                terms.forEach((term) => keywords.add(term));
                keywords.add(species);
            }
        });

        PRODUCT_TYPE_TERMS.forEach((term) => {
            if (searchText.includes(term)) keywords.add(term);
        });
    });

    return {
        categoryIds: [...categoryIds].filter((id) => mongoose.isValidObjectId(id)),
        keywords: [...keywords].slice(0, 12),
    };
};

const findSimilarProductsFromSignals = async ({ categoryIds, keywords, excludeIds, limit = PRODUCT_LIMIT }) => {
    const recommendations = [];
    const excludedObjectIds = [...excludeIds].filter((id) => mongoose.isValidObjectId(id));
    const baseFilter = excludedObjectIds.length ? { _id: { $nin: excludedObjectIds } } : {};

    if (categoryIds.length) {
        const categoryProducts = await Product.find({ ...baseFilter, category: { $in: categoryIds } })
            .populate('category', 'name slug')
            .select(PRODUCT_SELECT_FIELDS)
            .sort({ stock: -1, averageRating: -1, sold: -1, views: -1, createdAt: -1 })
            .limit(12)
            .lean();

        pushUniqueProducts(recommendations, categoryProducts, limit);
    }

    if (recommendations.length < limit && keywords.length) {
        const regexes = keywords.map((keyword) => new RegExp(escapeRegex(keyword), 'i'));
        const keywordProducts = await Product.find({
            ...baseFilter,
            $or: [
                ...regexes.map((regex) => ({ name: regex })),
                ...regexes.map((regex) => ({ description: regex })),
                ...regexes.map((regex) => ({ 'specifications.Giống': regex })),
                ...regexes.map((regex) => ({ 'specifications.Loại': regex })),
                ...regexes.map((regex) => ({ 'specifications.Dành cho': regex })),
            ],
        })
            .populate('category', 'name slug')
            .select(PRODUCT_SELECT_FIELDS)
            .sort({ stock: -1, averageRating: -1, sold: -1, views: -1, createdAt: -1 })
            .limit(12)
            .lean();

        pushUniqueProducts(recommendations, sortProductsForSupport(keywordProducts, keywords), limit);
    }

    if (recommendations.length < limit) {
        const fallbackProducts = await getPopularProducts({ excludeIds, limit: limit * 3 });
        pushUniqueProducts(recommendations, fallbackProducts, limit);
    }

    return recommendations.slice(0, limit);
};

const getUserBehaviorProductIds = async (userId) => {
    const [cart, collection, orders] = await Promise.all([
        Cart.findOne({ user: userId }).select('items.product').lean(),
        Collection.findOne({ user: userId }).select('products').lean(),
        Order.find({ user: userId, status: { $ne: 'Cancelled' } })
            .select('orderItems.product')
            .sort({ createdAt: -1 })
            .limit(8)
            .lean(),
    ]);

    const cartIds = (cart?.items || []).map((item) => getIdString(item.product)).filter(Boolean);
    const favoriteIds = (collection?.products || []).map(getIdString).filter(Boolean);
    const purchasedIds = orders.flatMap((order) =>
        (order.orderItems || []).map((item) => getIdString(item.product)).filter(Boolean),
    );

    return {
        cartIds,
        favoriteIds,
        purchasedIds,
        signalIds: [...new Set([...favoriteIds, ...cartIds, ...purchasedIds])],
    };
};

const findPersonalizedProducts = async (user) => {
    const userId = user?._id;
    if (!userId) {
        return {
            products: await getPopularProducts(),
            personalized: false,
        };
    }

    const behavior = await getUserBehaviorProductIds(userId);
    if (!behavior.signalIds.length) {
        return {
            products: await getPopularProducts(),
            personalized: false,
        };
    }

    const signalProducts = await Product.find({ _id: { $in: behavior.signalIds } })
        .populate('category', 'name slug')
        .select(PRODUCT_SELECT_FIELDS)
        .lean();
    const orderedSignalProducts = behavior.signalIds
        .map((id) => signalProducts.find((product) => getIdString(product) === id))
        .filter(Boolean);
    const signals = extractBehaviorSignals(orderedSignalProducts);
    const excludeIds = new Set(behavior.cartIds);
    const products = await findSimilarProductsFromSignals({
        categoryIds: signals.categoryIds,
        keywords: signals.keywords,
        excludeIds,
    });

    return {
        products,
        personalized: products.length > 0,
    };
};

const fetchSpeciesAnimalListings = async (petSpecies, intent, priceIntent, { useAllProducts = false } = {}) => {
    const baseFilters = buildBaseProductFilters(intent, priceIntent);
    let filter = baseFilters.length ? { $and: [...baseFilters] } : {};

    if (!useAllProducts) {
        const category = await Category.findOne({ slug: petSpecies }).select('_id').lean();
        if (category?._id) {
            filter = baseFilters.length
                ? { $and: [...baseFilters, { category: category._id }] }
                : { category: category._id };
        }
    }

    const products = await Product.find(filter)
        .populate('category', 'name slug')
        .select(PRODUCT_SELECT_FIELDS)
        .sort({ stock: -1, averageRating: -1, sold: -1, createdAt: -1 })
        .limit(useAllProducts ? 300 : 200)
        .lean();

    return products.filter((product) => {
        const classification = classifyProduct(product);
        return classification.species === petSpecies && classification.kind === 'animal';
    });
};

const logDogRecommendationDebug = ({
    message,
    detectedSpecies,
    recommendationIntent,
    sourceProducts,
    matchedProducts,
    finalProducts,
}) => {
    if (process.env.NODE_ENV === 'production' || detectedSpecies !== 'dog') return;

    const dogCandidates = sourceProducts.map((product) => ({
        product,
        classification: classifyProduct(product),
    })).filter(({ classification }) => classification.species === 'dog');

    const matchedIds = new Set(matchedProducts.map((product) => getIdString(product)));

    console.info('[Chatbot:debug:dogRecommendation]', {
        normalizedQuery: normalizeText(message),
        detectedSpecies,
        detectedIntent: recommendationIntent,
        totalProducts: sourceProducts.length,
        dogCandidateCount: dogCandidates.length,
        dogAnimalCount: dogCandidates.filter(({ classification }) => classification.kind === 'animal').length,
        dogAccessoryCount: dogCandidates.filter(({ classification }) => classification.kind !== 'animal').length,
        finalRecommendationCount: finalProducts.length,
        excludedDogCandidates: dogCandidates
            .filter(({ product, classification }) => !matchedIds.has(getIdString(product)) && classification.kind !== 'animal')
            .slice(0, 20)
            .map(({ product, classification }) => ({
                name: product.name,
                kind: classification.kind,
                reason: classification.debugReason,
            })),
    });
};

const findRelevantProducts = async (message, intent) => {
    try {
        const keywords = extractProductKeywords(message, intent);
        const recommendationIntent = detectChatbotProductIntent(message);
        const detectedSpecies = getPetSpecies(message);
        const petSpecies = detectedSpecies === 'accessory' ? '' : detectedSpecies;
        const priceIntent = parsePriceIntent(message);
        const hasSpecificTypeIntent = hasProductTypeIntent(message);
        const breedContext = getRequestedBreedContext(message);
        const breedTerms = breedContext.terms;
        const hasSpecificBreedIntent = breedTerms.length > 0;
        const supportProductGroup = recommendationIntent === 'ACCESSORY_PURCHASE'
            ? getRequestedSupportProductGroup(message)
            : null;
        const strictCategoryMode = Boolean(petSpecies);
        const filter = await buildProductFilter(message, intent, keywords);
        const products = await Product.find(filter)
            .populate('category', 'name slug')
            .select(PRODUCT_SELECT_FIELDS)
            .sort({ stock: -1, averageRating: -1, sold: -1, createdAt: -1 })
            .limit(80)
            .lean();

        if (process.env.NODE_ENV !== 'production') {
            console.info('[Chatbot:debug]', {
                message,
                normalizedMessage: normalizeText(message),
                detectedSpecies,
                petSpecies,
                recommendationIntent,
                hasSpecificTypeIntent,
                hasSpecificBreedIntent,
                totalFetched: products.length,
            });
        }

        const speciesFilteredProducts = petSpecies
            ? products.filter((product) => productMatchesAnimalSpeciesStrictly(product, petSpecies))
            : products;

        if (process.env.NODE_ENV !== 'production') {
            console.info('[Chatbot:debug:speciesFilter]', {
                speciesFilteredCount: speciesFilteredProducts.length,
            });
        }

        let typeProducts = speciesFilteredProducts.filter((product) =>
            productMatchesRecommendationIntent(product, recommendationIntent, petSpecies),
        );

        if (process.env.NODE_ENV !== 'production') {
            console.info('[Chatbot:debug:typeFilter]', {
                typeProductsCount: typeProducts.length,
                recommendationIntent,
            });
        }

        if (supportProductGroup) {
            typeProducts = typeProducts.filter((product) => productMatchesSupportGroup(product, supportProductGroup));
        }

        let speciesProducts = typeProducts;
        let breedFallback = false;
        let usedPetListingFallback = false;

        if (hasSpecificBreedIntent) {
            const breedProducts = speciesProducts.filter((product) => productMatchesBreed(product, breedTerms));
            if (breedProducts.length) {
                speciesProducts = breedProducts;
            } else {
                breedFallback = true;
            }
        }

        if (
            recommendationIntent === 'PET_PURCHASE'
            && petSpecies
            && !speciesProducts.length
        ) {
            let fallbackProducts = await fetchSpeciesAnimalListings(petSpecies, intent, priceIntent);
            if (!fallbackProducts.length) {
                fallbackProducts = await fetchSpeciesAnimalListings(petSpecies, intent, priceIntent, { useAllProducts: true });
            }
            if (fallbackProducts.length) {
                speciesProducts = fallbackProducts;
                usedPetListingFallback = true;
            }
        }

        if (
            petSpecies
            && !speciesProducts.length
            && !hasSpecificTypeIntent
            && !hasSpecificBreedIntent
            && recommendationIntent !== 'PET_PURCHASE'
        ) {
            const baseFilters = buildBaseProductFilters(intent, priceIntent);
            const broaderFilter = baseFilters.length ? { $and: baseFilters } : {};
            const broaderProducts = await Product.find(broaderFilter)
                .populate('category', 'name slug')
                .select(PRODUCT_SELECT_FIELDS)
                .sort({ stock: -1, averageRating: -1, sold: -1, createdAt: -1 })
                .limit(120)
                .lean();

            const broaderTypeProducts = broaderProducts
                .filter((product) => productMatchesRecommendationIntent(product, recommendationIntent, petSpecies))
                .filter((product) => !supportProductGroup || productMatchesSupportGroup(product, supportProductGroup));

            speciesProducts = broaderTypeProducts
                .filter((product) => productMatchesAnimalSpeciesStrictly(product, petSpecies));

            if (process.env.NODE_ENV !== 'production') {
                console.info('[Chatbot:debug:ambiguousFallback]', {
                    ambiguousFallbackCount: speciesProducts.length,
                });
            }
        }

        const finalProducts = sortProductsForSupport(
            petSpecies ? speciesProducts : typeProducts,
            keywords,
            priceIntent,
        ).slice(0, PRODUCT_LIMIT);

        logDogRecommendationDebug({
            message,
            detectedSpecies,
            recommendationIntent,
            sourceProducts: usedPetListingFallback ? speciesProducts : products,
            matchedProducts: petSpecies ? speciesProducts : typeProducts,
            finalProducts,
        });

        return {
            products: finalProducts,
            lookupFailed: false,
            strictCategoryMode,
            requestedSpecies: petSpecies,
            requestedBreed: breedContext.label,
            breedFallback,
            priceIntent,
            recommendationIntent,
        };
    } catch (err) {
        console.error('[Chatbot:findRelevantProducts] Error:', err?.message);
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

const formatRecommendationSpecs = (specifications, description = '') => {
    if (!specifications) {
        return stripHtml(description).slice(0, 70);
    }

    const entries = specifications instanceof Map
        ? [...specifications.entries()]
        : Object.entries(specifications);
    const preferredKeys = [
        'thuong hieu',
        'trong luong',
        'dung tich',
        'phu hop',
        'chat lieu',
        'kich thuoc',
    ];
    const normalizedEntries = entries
        .map(([key, value]) => ({
            key: String(key).trim(),
            value: String(value || '').trim(),
            normalizedKey: normalizeText(key),
        }))
        .filter((entry) => entry.key && entry.value);
    const preferredEntries = preferredKeys
        .map((preferredKey) => normalizedEntries.find((entry) => entry.normalizedKey.includes(preferredKey)))
        .filter(Boolean);
    const fallbackEntries = normalizedEntries.filter((entry) =>
        !preferredEntries.some((preferredEntry) => preferredEntry.key === entry.key),
    );
    const selectedEntries = [...preferredEntries, ...fallbackEntries].slice(0, 3);

    return selectedEntries
        .map(({ key, value }) => `${key}: ${value}`)
        .join(', ');
};

const formatProductRecommendations = (products) =>
    products.slice(0, PRODUCT_LIMIT).map((product, index) => {
        const specs = formatRecommendationSpecs(product.specifications, product.description);
        const specsText = specs ? `. ${specs}` : '';

        return `${index + 1}. ${product.name} - ${formatCurrency(product.price)}${specsText}`;
    }).join('\n');

const getProductReply = async (message, intent, user) => {
    const hasSpecificSignal = hasSpecificProductSignal(message, intent);
    let productContext;

    if (hasSpecificSignal) {
        productContext = await findRelevantProducts(message, intent);
    } else {
        try {
            const personalizedContext = await findPersonalizedProducts(user);
            productContext = {
                products: personalizedContext.products,
                lookupFailed: false,
                personalized: personalizedContext.personalized,
            };
        } catch {
            productContext = {
                products: [],
                lookupFailed: true,
            };
        }
    }

    if (productContext.lookupFailed) {
        return 'Mình chưa thể tải dữ liệu sản phẩm lúc này. Bạn có thể thử lại sau hoặc tìm trực tiếp trong trang Sản phẩm.';
    }

    if (!productContext.products.length && productContext.recommendationIntent !== 'PET_PURCHASE') {
        return 'Hiện tại mình chưa tìm thấy sản phẩm phù hợp.';
    }

    if (!productContext.products.length) {
        return 'Hiện tại mình chưa tìm thấy thú cưng phù hợp.';
    }

    const breedFallbackPrefix = productContext.breedFallback && productContext.requestedBreed
        ? `Hiện PetMart chưa có sản phẩm đúng giống ${productContext.requestedBreed}. Mình gợi ý một số sản phẩm cùng loài ${SPECIES_LABELS[productContext.requestedSpecies] || 'thú cưng'}:\n`
        : '';

    // PET_PURCHASE: listing products only → "bé chó / bé mèo / bé thỏ" wording.
    // ACCESSORY_PURCHASE: support products → "sản phẩm dành cho chó" wording.
    const prefix = breedFallbackPrefix || (intent.sale
        ? 'Mình tìm thấy một số sản phẩm đang có giá tốt trong PetMart:\n'
        : productContext.personalized
            ? 'Dựa trên sản phẩm bạn đã quan tâm, mình gợi ý 3 món này:\n'
            : productContext.recommendationIntent === 'PET_PURCHASE' && productContext.requestedSpecies
                ? `Mình gợi ý một vài ${ANIMAL_RECOMMENDATION_LABELS[productContext.requestedSpecies] || 'thú cưng'} hiện có trong PetMart:\n`
                : productContext.recommendationIntent === 'ACCESSORY_PURCHASE' && productContext.requestedSpecies
                    ? `Mình gợi ý một vài sản phẩm dành cho ${SPECIES_LABELS[productContext.requestedSpecies] || 'thú cưng'} hiện có trong PetMart:\n`
                    : 'Mình gợi ý một vài sản phẩm có trong PetMart:\n');

    return `${prefix}${formatProductRecommendations(productContext.products)}`;
};

const BLOG_IGNORED_TERMS = new Set([
    'blog', 'bai', 'viet', 'article', 'tin', 'tuc', 'news', 'meo', 'tips',
    'co', 'nao', 'khong', 've', 'cho', 'minh', 'toi', 'xem', 'doc', 'goi',
    'y', 'tim', 'kiem', 'dung', 'lam', 'gi',
]);

const extractBlogKeywords = (message) => {
    const words = normalizeText(message)
        .split(/[^a-z0-9]+/)
        .map((word) => word.trim())
        .filter((word) => word.length >= 2 && !BLOG_IGNORED_TERMS.has(word));

    const species = getPetSpecies(message);
    const speciesTerms = species && PET_CATEGORY_TERMS[species] ? PET_CATEGORY_TERMS[species] : [];

    return [...new Set([...words, ...speciesTerms])].slice(0, 8);
};

const formatBlogSuggestions = (posts) => posts.map((post, index) => {
    const excerpt = stripHtml(post.excerpt || post.content || '').slice(0, 120);
    const stats = [
        post.views ? `${post.views} lượt xem` : null,
        Array.isArray(post.likes) && post.likes.length ? `${post.likes.length} lượt thích` : null,
    ].filter(Boolean).join(', ');

    return `${index + 1}. ${post.title}${stats ? ` (${stats})` : ''}${excerpt ? ` - ${excerpt}` : ''}.`;
}).join('\n');

const getBlogReply = async (message) => {
    const normalizedMessage = normalizeText(message);
    const wantsPurpose = /(blog.*(lam gi|dung de|la gi)|muc blog|blog cua web)/.test(normalizedMessage);
    const keywords = extractBlogKeywords(message);
    const intro = 'Blog PetMart là nơi chia sẻ mẹo chăm sóc thú cưng, kinh nghiệm chọn sản phẩm, dinh dưỡng, vệ sinh và các bài viết hữu ích cho người nuôi thú cưng.';

    try {
        const regexes = keywords.map((keyword) => new RegExp(escapeRegex(keyword), 'i'));
        const filter = { type: 'blog' };

        if (regexes.length && !wantsPurpose) {
            filter.$or = [
                ...regexes.map((regex) => ({ title: regex })),
                ...regexes.map((regex) => ({ tags: regex })),
                ...regexes.map((regex) => ({ content: regex })),
            ];
        }

        const posts = await Post.find(filter)
            .select('title slug content excerpt tags views likes createdAt')
            .sort({ views: -1, createdAt: -1 })
            .limit(3)
            .lean();

        if (!posts.length) {
            return `${intro}\nHiện tại chưa có bài viết phù hợp, bạn có thể xem thêm tại mục Blog.`;
        }

        return `${intro}\nMình gợi ý một vài bài viết có sẵn:\n${formatBlogSuggestions(posts)}`;
    } catch {
        return `${intro}\nHiện tại chưa có bài viết phù hợp, bạn có thể xem thêm tại mục Blog.`;
    }
};

const getRequestedOrderCode = (message) => {
    const objectId = message.match(/[a-f\d]{24}/i)?.[0];
    if (objectId) return objectId;

    const shortCode = message.match(/#?\b[a-z0-9]{6,12}\b/i)?.[0]?.replace('#', '');
    return shortCode || '';
};

const asksForOwnOrder = (message) => {
    const normalizedMessage = normalizeText(message);
    return /(cua toi|cua minh|don toi|don minh|toi co don|don nao|dang giao|da mua gi|toi da mua|lich su mua|gan nhat|ma don|#|order)/.test(normalizedMessage)
        || Boolean(message.match(/[a-f\d]{24}/i));
};

const parseOrderStatusIntent = (message) => {
    const normalizedMessage = normalizeText(message);
    if (/\b(dang giao|van chuyen|shipping)\b/.test(normalizedMessage)) return 'Shipping';
    if (/\b(dang xu ly|xu ly|processing)\b/.test(normalizedMessage)) return 'Processing';
    if (/\b(cho xac nhan|pending|cho duyet)\b/.test(normalizedMessage)) return 'Pending';
    if (/\b(da giao|delivered|hoan tat)\b/.test(normalizedMessage)) return 'Delivered';
    if (/\b(da huy|huy)\b/.test(normalizedMessage)) return 'Cancelled';
    return '';
};

const findOrdersForUser = async ({ userId, requestedCode, status }) => {
    if (requestedCode && mongoose.isValidObjectId(requestedCode)) {
        return Order.find({ _id: requestedCode, user: userId, ...(status && { status }) })
            .select('orderItems totalPrice status paymentMethod isPaid createdAt cancelStatus cancelRequested cancelRequestedAt')
            .sort({ createdAt: -1 })
            .limit(1)
            .lean();
    }

    const orders = await Order.find({ user: userId, ...(status && { status }) })
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
        order.createdAt ? `Ngày đặt: ${formatDateTime(order.createdAt)}` : null,
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
        return 'Bạn cần đăng nhập để mình kiểm tra đơn hàng.';
    }

    try {
        const requestedCode = getRequestedOrderCode(message);
        const requestedStatus = parseOrderStatusIntent(message);
        const orders = await findOrdersForUser({ userId: user._id, requestedCode, status: requestedStatus });

        if (!orders.length) {
            return requestedCode
                ? 'Mình không tìm thấy đơn hàng phù hợp trong tài khoản hiện tại. Vui lòng kiểm tra lại mã đơn hoặc mở trang Đơn hàng của bạn.'
                : requestedStatus
                    ? `Tài khoản hiện tại chưa có đơn hàng nào ở trạng thái ${ORDER_STATUS_LABELS[requestedStatus] || requestedStatus}.`
                    : 'Tài khoản hiện tại chưa có đơn hàng nào để kiểm tra.';
        }

        const title = requestedCode
            ? 'Mình tìm thấy đơn hàng này trong tài khoản của bạn:'
            : requestedStatus
                ? `Các đơn hàng ${ORDER_STATUS_LABELS[requestedStatus] || requestedStatus} của bạn:`
                : 'Các đơn hàng gần đây của bạn:';
        return `${title}\n${orders.map(formatOrderSummary).join('\n')}`;
    } catch {
        return 'Mình chưa thể tải đơn hàng lúc này. Bạn vui lòng thử lại sau hoặc mở trang Đơn hàng để kiểm tra.';
    }
};

const getStaticReply = (intent) => {
    if (intent.greeting) {
        return 'Xin chào! Mình là trợ lý PetMart. Mình có thể hỗ trợ bạn tìm sản phẩm, đọc blog chăm sóc thú cưng, hướng dẫn đặt hàng, thanh toán, kiểm tra đơn hàng hoặc hỗ trợ tài khoản.';
    }

    if (intent.about) {
        return 'PetMart là website thương mại điện tử dành cho thú cưng, bán thú cưng, thức ăn và phụ kiện. Bạn có thể xem sản phẩm, thêm vào giỏ hàng, yêu thích sản phẩm, đặt hàng, thanh toán COD/VNPay, theo dõi đơn hàng, đọc blog chăm sóc thú cưng và nhận hỗ trợ qua chatbot.';
    }

    if (intent.blog) {
        return 'Blog PetMart chia sẻ mẹo chăm sóc thú cưng, kiến thức dinh dưỡng, vệ sinh và kinh nghiệm chọn sản phẩm. Bạn có thể mở mục Blog để đọc các bài viết mới nhất.';
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
        return 'Để đặt hàng, bạn kiểm tra giỏ hàng, nhập địa chỉ và số điện thoại giao hàng, chọn COD hoặc VNPay rồi xác nhận. Phí vận chuyển hiện là 30.000đ và miễn phí khi đơn hàng từ 500.000đ.';
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

    if (intent.blog) {
        reply = await getBlogReply(message);
    } else if (intent.about) {
        reply = getStaticReply(intent);
    } else if ((intent.order || intent.cancel) && asksForOwnOrder(message)) {
        reply = await getOrderReply(message, user, intent);
    } else if (intent.product) {
        reply = await getProductReply(message, intent, user);
    } else if (intent.cancel && !asksForOwnOrder(message)) {
        reply = getStaticReply(intent);
    } else if (intent.order || intent.cancel) {
        reply = await getOrderReply(message, user, intent);
    } else {
        reply = getStaticReply(intent)
            || 'Mình chưa hiểu rõ câu hỏi của bạn. Bạn có thể hỏi về sản phẩm, blog, đơn hàng, thanh toán hoặc tài khoản.';
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
