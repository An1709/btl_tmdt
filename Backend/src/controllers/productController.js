import Product from '../models/Product.js';
import Review from '../models/Review.js'; // Nhớ import Review Model
import APIFeatures from '../utils/apiFeatures.js';

// @desc    Lấy tất cả sản phẩm (Có lọc nâng cao, sort, phân trang)
// @route   GET /api/products
export const getProducts = async (req, res) => {
    try {
        // Sử dụng APIFeatures để xử lý query params
        // VD: ?keyword=meo&price[gte]=100000&sort=-price&page=1
        const features = new APIFeatures(Product.find(), req.query)
            .search()  // Tìm theo tên
            .filter()  // Lọc theo giá, danh mục...
            .sort()    // Sắp xếp
            .limitFields()
            .pagination();

        // Thực thi query
        const products = await features.query;
        
        // Đếm tổng số lượng (để frontend biết bao nhiêu trang)
        // Lưu ý: countDocuments độc lập để đếm chính xác
        const totalProducts = await Product.countDocuments(features.query._conditions);

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

// @desc    Lấy chi tiết 1 sản phẩm
// @route   GET /api/products/:id
export const getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('category', 'name slug'); // Lấy cả tên danh mục
            
        if (product) {
            // Tăng lượt xem (Có thể dùng Redis để tối ưu, nhưng tạm thời dùng cách này ok)
            product.views = (product.views || 0) + 1;
            await product.save({ validateBeforeSave: false }); // Tắt validate để save nhanh hơn

            // Gợi ý thêm: Lấy các review của sản phẩm này trả về luôn
            // const reviews = await Review.find({ product: req.params.id }).populate('user', 'fullName avatar');

            res.json(product);
        } else {
            res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Tạo đánh giá sản phẩm (Sửa lỗi logic cũ)
// @route   POST /api/products/:id/reviews
export const createProductReview = async (req, res) => {
    const { rating, comment } = req.body;

    try {
        const product = await Product.findById(req.params.id);

        if (product) {
            // 1. Kiểm tra xem user đã review sản phẩm này chưa
            const alreadyReviewed = await Review.findOne({
                user: req.user._id,
                product: req.params.id
            });

            if (alreadyReviewed) {
                return res.status(400).json({ message: 'Bạn đã đánh giá sản phẩm này rồi' });
            }

            // 2. Tạo Review mới trong bảng Review 
            await Review.create({
                user: req.user._id,
                product: req.params.id,
                rating: Number(rating),
                comment,
                isPurchased: true // Giả sử middleware check mua hàng đã chạy trước đó
            });

            // 3. Tính toán lại rating trung bình cho Product
            // Lấy tất cả review của sản phẩm này để tính chính xác nhất
            const reviews = await Review.find({ product: req.params.id });
            
            product.reviewCount = reviews.length;
            product.averageRating = 
                reviews.reduce((acc, item) => item.rating + acc, 0) / reviews.length;

            await product.save();
            
            res.status(201).json({ message: 'Đánh giá thành công' });
        } else {
            res.status(404).json({ message: 'Sản phẩm không tồn tại' });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Tạo sản phẩm (Admin) - Thêm Slug
// @route   POST /api/products
export const createProduct = async (req, res) => {
    try {
        const { name, price, description, category, stock, images, specifications } = req.body;
        
        // Tự động tạo slug từ tên (VD: "Mèo Anh" -> "meo-anh")
        const slug = name.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Bỏ dấu tiếng Việt
            .replace(/ /g, '-');

        const product = new Product({
            name,
            slug, 
            price,
            description,
            category,
            stock,
            images,
            specifications, // Thêm thông số kỹ thuật (quan trọng cho pet shop)
            user: req.user._id,
        });

        const createdProduct = await product.save();
        res.status(201).json(createdProduct);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Cập nhật sản phẩm (Admin) - (MỚI)
// @route   PUT /api/products/:id
export const updateProduct = async (req, res) => {
    try {
        const { name, price, description, category, stock, images, specifications } = req.body;
        const product = await Product.findById(req.params.id);

        if (product) {
            product.name = name || product.name;
            product.price = price || product.price;
            product.description = description || product.description;
            product.category = category || product.category;
            product.stock = stock || product.stock;
            product.images = images || product.images;
            product.specifications = specifications || product.specifications;

            // Nếu đổi tên thì update lại slug
            if (name) {
                 product.slug = name.toLowerCase()
                    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                    .replace(/ /g, '-');
            }

            const updatedProduct = await product.save();
            res.json(updatedProduct);
        } else {
            res.status(404).json({ message: 'Sản phẩm không tồn tại' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Xóa sản phẩm (Admin) - (MỚI)
// @route   DELETE /api/products/:id
export const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (product) {
            await product.deleteOne(); // Dùng deleteOne thay vì remove (cũ)
            res.json({ message: 'Sản phẩm đã được xóa' });
        } else {
            res.status(404).json({ message: 'Sản phẩm không tồn tại' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};