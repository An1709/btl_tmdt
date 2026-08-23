import WarrantyRequest from '../models/WarrantyRequest.js';
import Order from '../models/Order.js';
import mongoose from 'mongoose';
import { uploadImage } from '../utils/cloudinaryUpload.js';

const WARRANTY_STATUSES = ['Pending', 'Approved', 'Rejected', 'Completed'];

const normalizeImageUrls = (images) => {
    const values = Array.isArray(images) ? images : images ? [images] : [];
    return values.filter((value) => typeof value === 'string' && value.trim()).slice(0, 5);
};

const toPublicUploadUrl = (req, imageUrl) => imageUrl.startsWith('/uploads/')
    ? `${req.protocol}://${req.get('host')}${imageUrl}`
    : imageUrl;

// @desc    Gửi yêu cầu bảo hành (User)
// @route   POST /api/warranty
export const createWarrantyRequest = async (req, res) => {
    const { orderId, productId, reason, images } = req.body;

    try {
        if (!mongoose.isValidObjectId(orderId) || !mongoose.isValidObjectId(productId)) {
            return res.status(400).json({ message: 'Đơn hàng hoặc sản phẩm không hợp lệ.' });
        }

        const normalizedReason = typeof reason === 'string' ? reason.trim() : '';
        if (!normalizedReason) {
            return res.status(400).json({ message: 'Vui lòng mô tả vấn đề cần bảo hành.' });
        }

        // Kiểm tra xem đơn hàng có tồn tại và thuộc về user này không
        const order = await Order.findOne({ _id: orderId, user: req.user._id });
        if (!order) {
            return res.status(404).json({ message: 'Không tìm thấy đơn hàng hoặc bạn không có quyền' });
        }

        const belongsToOrder = order.orderItems.some(
            (item) => item.product?.toString() === productId,
        );
        if (!belongsToOrder) {
            return res.status(400).json({ message: 'Sản phẩm không thuộc đơn hàng đã chọn.' });
        }

        // Kiểm tra xem đã có yêu cầu bảo hành nào cho sản phẩm này trong đơn hàng này chưa (tránh spam)
        const existingRequest = await WarrantyRequest.findOne({ 
            order: orderId, 
            product: productId 
        });

        if (existingRequest) {
            return res.status(400).json({ message: 'Bạn đã gửi yêu cầu bảo hành cho sản phẩm này rồi.' });
        }

        const uploadedImages = await Promise.all(
            (req.files || []).map((file, index) => uploadImage(file, 'petmart/warranty', {
                publicId: `warranty_${req.user._id}_${Date.now()}_${index}`,
            })),
        );
        const imageUrls = [
            ...normalizeImageUrls(images),
            ...uploadedImages.map((imageUrl) => toPublicUploadUrl(req, imageUrl)),
        ].slice(0, 5);

        const warrantyRequest = await WarrantyRequest.create({
            user: req.user._id,
            order: orderId,
            product: productId,
            reason: normalizedReason,
            images: imageUrls,
            status: 'Pending'
        });

        return res.status(201).json(warrantyRequest);
    } catch (error) {
        if (error.message === 'CLOUDINARY_CONFIG_MISSING') {
            return res.status(500).json({ message: 'Chưa cấu hình dịch vụ lưu ảnh minh chứng.' });
        }

        return res.status(500).json({ message: 'Không thể gửi yêu cầu bảo hành. Vui lòng thử lại.' });
    }
};

// @desc    Lấy danh sách yêu cầu bảo hành của tôi
// @route   GET /api/warranty/my-requests
export const getMyWarrantyRequests = async (req, res) => {
    try {
        const requests = await WarrantyRequest.find({ user: req.user._id })
            .populate('product', 'name image')
            .sort({ createdAt: -1 });
        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Lấy tất cả yêu cầu bảo hành (Admin)
// @route   GET /api/warranty/admin
export const getAllWarrantyRequests = async (req, res) => {
    try {
        const requests = await WarrantyRequest.find({})
            .populate('user', 'username displayName email phone')
            .populate('product', 'name price image')
            .sort({ createdAt: -1 });
        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Cập nhật trạng thái bảo hành (Admin - Duyệt/Từ chối)
// @route   PUT /api/warranty/admin/:id
export const updateWarrantyStatus = async (req, res) => {
    const { status, adminResponse } = req.body; 
    // status: 'Approved', 'Rejected', 'Completed'

    try {
        if (!WARRANTY_STATUSES.includes(status)) {
            return res.status(400).json({ message: 'Trạng thái bảo hành không hợp lệ.' });
        }

        const request = await WarrantyRequest.findById(req.params.id);

        if (!request) {
            return res.status(404).json({ message: 'Không tìm thấy yêu cầu' });
        }

        request.status = status;
        request.adminResponse = adminResponse || ''; // Ghi chú lý do nếu từ chối
        
        await request.save();

        // (Optional) Gửi email thông báo cho User tại đây
        // sendEmail(request.user.email, 'Cập nhật trạng thái bảo hành', ...)

        res.json(request);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
