import WarrantyRequest from '../models/WarrantyRequest.js';
import Order from '../models/Order.js';

// @desc    Gửi yêu cầu bảo hành (User)
// @route   POST /api/warranty
export const createWarrantyRequest = async (req, res) => {
    const { orderId, productId, reason, images } = req.body;

    try {
        // Kiểm tra xem đơn hàng có tồn tại và thuộc về user này không
        const order = await Order.findOne({ _id: orderId, user: req.user._id });
        if (!order) {
            return res.status(404).json({ message: 'Không tìm thấy đơn hàng hoặc bạn không có quyền' });
        }

        // Kiểm tra xem đã có yêu cầu bảo hành nào cho sản phẩm này trong đơn hàng này chưa (tránh spam)
        const existingRequest = await WarrantyRequest.findOne({ 
            order: orderId, 
            product: productId 
        });

        if (existingRequest) {
            return res.status(400).json({ message: 'Bạn đã gửi yêu cầu bảo hành cho sản phẩm này rồi.' });
        }

        const warrantyRequest = await WarrantyRequest.create({
            user: req.user._id,
            order: orderId,
            product: productId,
            reason,
            images,
            status: 'Pending'
        });

        res.status(201).json(warrantyRequest);
    } catch (error) {
        res.status(500).json({ message: error.message });
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
            .populate('user', 'fullName email phone')
            .populate('product', 'name price')
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