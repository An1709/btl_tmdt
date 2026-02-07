import User from '../models/User.js';

// @desc    Lấy thông tin người dùng hiện tại (Profile)
// @route   GET /api/users/profile
// @access  Private (User/Admin)
export const getUserProfile = async (req, res) => {
    try {
        // req.user đã có từ middleware `protectedRoute`
        const user = await User.findById(req.user._id).select('-password');

        if (user) {
            res.status(200).json({
                _id: user._id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                phone: user.phone,
                address: user.address,
                avatar: user.avatar,
            });
        } else {
            res.status(404).json({ message: 'Không tìm thấy người dùng' });
        }
    } catch (error) {
        console.error('Error in getUserProfile:', error);
        res.status(500).json({ message: 'Lỗi server khi lấy thông tin cá nhân' });
    }
};

// @desc    Cập nhật thông tin cá nhân
// @route   PUT /api/users/profile
// @access  Private
export const updateUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            // Cập nhật các trường nếu có gửi lên, nếu không giữ nguyên cũ
            user.fullName = req.body.fullName || user.fullName;
            user.phone = req.body.phone || user.phone;
            user.address = req.body.address || user.address;
            user.avatar = req.body.avatar || user.avatar;

            // Nếu user gửi password mới thì cập nhật (Model sẽ tự hash lại)
            if (req.body.password) {
                user.password = req.body.password;
            }

            const updatedUser = await user.save();

            res.json({
                _id: updatedUser._id,
                fullName: updatedUser.fullName,
                email: updatedUser.email,
                role: updatedUser.role,
                phone: updatedUser.phone,
                address: updatedUser.address,
                avatar: updatedUser.avatar,
                token: req.headers.authorization.split(' ')[1] // Trả lại token cũ
            });
        } else {
            res.status(404).json({ message: 'Không tìm thấy người dùng' });
        }
    } catch (error) {
        console.error('Error in updateUserProfile:', error);
        res.status(500).json({ message: 'Lỗi server khi cập nhật thông tin' });
    }
};

// @desc    Lấy danh sách tất cả user
// @route   GET /api/users
// @access  Private/Admin
export const getAllUsers = async (req, res) => {
    try {
        // Lấy tất cả user nhưng bỏ trường password
        const users = await User.find({}).select('-password');
        res.status(200).json(users);
    } catch (error) {
        console.error('Error in getAllUsers:', error);
        res.status(500).json({ message: 'Lỗi server khi lấy danh sách user' });
    }
};

// @desc    Xóa user theo ID
// @route   DELETE /api/users/:id
// @access  Private/Admin
export const deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (user) {
            // Ngăn chặn admin tự xóa chính mình
            if (user._id.toString() === req.user._id.toString()) {
                return res.status(400).json({ message: 'Bạn không thể tự xóa tài khoản của chính mình' });
            }

            await user.deleteOne();
            res.status(200).json({ message: 'Đã xóa người dùng thành công' });
        } else {
            res.status(404).json({ message: 'Người dùng không tồn tại' });
        }
    } catch (error) {
        console.error('Error in deleteUser:', error);
        res.status(500).json({ message: 'Lỗi server khi xóa user' });
    }
};

// @desc    Test route
// @route   GET /api/users/test
export const test = async (req, res) => {
    return res.status(200).json({ message: "User route is working!" });
};