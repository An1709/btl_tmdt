import bcrypt from 'bcrypt';
import User from '../models/User.js';

const USER_ROLES = ['customer', 'admin', 'staff'];

const sanitizeUser = (user) => ({
    _id: user._id,
    username: user.username,
    displayName: user.displayName,
    email: user.email,
    role: user.role,
    phone: user.phone,
    address: user.address,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    isBlocked: user.isBlocked,
    isEmailVerified: user.isEmailVerified !== false,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
});

const normalizeUserPayload = (body) => ({
    username: body.username?.trim().toLowerCase(),
    email: body.email?.trim().toLowerCase(),
    displayName: body.displayName?.trim(),
    role: body.role,
    phone: body.phone?.trim(),
    address: body.address?.trim(),
    bio: body.bio?.trim(),
    avatarUrl: body.avatarUrl?.trim(),
});

const validateRole = (role) => !role || USER_ROLES.includes(role);

export const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-hashedPassword');
        if (!user) return res.status(404).json({ message: 'Khong tim thay nguoi dung' });

        return res.status(200).json(sanitizeUser(user));
    } catch (error) {
        console.error('Error in getUserProfile:', error);
        return res.status(500).json({ message: 'Loi server khi lay thong tin ca nhan' });
    }
};

export const updateUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'Khong tim thay nguoi dung' });

        const payload = normalizeUserPayload(req.body);
        if (payload.displayName !== undefined) user.displayName = payload.displayName || user.displayName;
        if (payload.phone !== undefined) user.phone = payload.phone;
        if (payload.address !== undefined) user.address = payload.address;
        if (payload.bio !== undefined) user.bio = payload.bio;
        if (payload.avatarUrl !== undefined) user.avatarUrl = payload.avatarUrl || user.avatarUrl;

        const updatedUser = await user.save();
        return res.status(200).json(sanitizeUser(updatedUser));
    } catch (error) {
        console.error('Error in updateUserProfile:', error);
        return res.status(500).json({ message: 'Loi server khi cap nhat thong tin' });
    }
};

export const getAllUsers = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
        const search = req.query.search?.trim() || '';

        const filter = search
            ? {
                $or: [
                    { username: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } },
                    { displayName: { $regex: search, $options: 'i' } },
                ],
            }
            : {};

        const [users, total] = await Promise.all([
            User.find(filter)
                .select('-hashedPassword')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit),
            User.countDocuments(filter),
        ]);

        return res.status(200).json({
            success: true,
            data: {
                users: users.map(sanitizeUser),
                total,
                page,
                limit,
            },
        });
    } catch (error) {
        console.error('Error in getAllUsers:', error);
        return res.status(500).json({ message: 'Loi server khi lay danh sach user' });
    }
};

export const createUser = async (req, res) => {
    try {
        const payload = normalizeUserPayload(req.body);
        const password = req.body.password;

        if (!payload.username || !payload.email || !payload.displayName || !password) {
            return res.status(400).json({ message: 'Username, email, ten hien thi va mat khau la bat buoc' });
        }

        if (!validateRole(payload.role)) {
            return res.status(400).json({ message: 'Vai tro khong hop le' });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'Mat khau phai co it nhat 6 ky tu' });
        }

        const duplicateUser = await User.findOne({
            $or: [{ username: payload.username }, { email: payload.email }],
        });

        if (duplicateUser) {
            return res.status(409).json({ message: 'Username hoac email da ton tai' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({
            ...payload,
            role: payload.role || 'customer',
            hashedPassword,
            isBlocked: Boolean(req.body.isBlocked),
            isEmailVerified: true,
        });

        return res.status(201).json({ success: true, data: sanitizeUser(user) });
    } catch (error) {
        console.error('Error in createUser:', error);
        return res.status(500).json({ message: 'Loi server khi tao user' });
    }
};

export const updateUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'Nguoi dung khong ton tai' });

        const payload = normalizeUserPayload(req.body);

        if (payload.role && !validateRole(payload.role)) {
            return res.status(400).json({ message: 'Vai tro khong hop le' });
        }

        if (payload.username && payload.username !== user.username) {
            const existingUsername = await User.findOne({ username: payload.username, _id: { $ne: user._id } });
            if (existingUsername) return res.status(409).json({ message: 'Username da ton tai' });
            user.username = payload.username;
        }

        if (payload.email && payload.email !== user.email) {
            const existingEmail = await User.findOne({ email: payload.email, _id: { $ne: user._id } });
            if (existingEmail) return res.status(409).json({ message: 'Email da ton tai' });
            user.email = payload.email;
        }

        if (payload.displayName !== undefined) user.displayName = payload.displayName || user.displayName;
        if (payload.phone !== undefined) user.phone = payload.phone;
        if (payload.address !== undefined) user.address = payload.address;
        if (payload.bio !== undefined) user.bio = payload.bio;
        if (payload.avatarUrl !== undefined) user.avatarUrl = payload.avatarUrl || user.avatarUrl;

        if (payload.role && user._id.toString() !== req.user._id.toString()) {
            user.role = payload.role;
        }

        const updatedUser = await user.save();
        return res.status(200).json({ success: true, data: sanitizeUser(updatedUser) });
    } catch (error) {
        console.error('Error in updateUser:', error);
        return res.status(500).json({ message: 'Loi server khi cap nhat user' });
    }
};

const setUserBlocked = async (req, res, isBlocked) => {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Nguoi dung khong ton tai' });

    if (user._id.toString() === req.user._id.toString()) {
        return res.status(400).json({ message: 'Ban khong the khoa tai khoan cua chinh minh' });
    }

    user.isBlocked = isBlocked;
    const updatedUser = await user.save();
    return res.status(200).json({ success: true, data: sanitizeUser(updatedUser) });
};

export const blockUser = async (req, res) => {
    try {
        return await setUserBlocked(req, res, true);
    } catch (error) {
        console.error('Error in blockUser:', error);
        return res.status(500).json({ message: 'Loi server khi khoa user' });
    }
};

export const unblockUser = async (req, res) => {
    try {
        return await setUserBlocked(req, res, false);
    } catch (error) {
        console.error('Error in unblockUser:', error);
        return res.status(500).json({ message: 'Loi server khi mo khoa user' });
    }
};

export const deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'Nguoi dung khong ton tai' });

        if (user._id.toString() === req.user._id.toString()) {
            return res.status(400).json({ message: 'Ban khong the vo hieu hoa tai khoan cua chinh minh' });
        }

        user.isBlocked = true;
        const updatedUser = await user.save();

        return res.status(200).json({
            success: true,
            message: 'Da vo hieu hoa tai khoan nguoi dung',
            data: sanitizeUser(updatedUser),
        });
    } catch (error) {
        console.error('Error in deleteUser:', error);
        return res.status(500).json({ message: 'Loi server khi vo hieu hoa user' });
    }
};

export const test = async (req, res) => {
    return res.status(200).json({ message: 'User route is working!' });
};
