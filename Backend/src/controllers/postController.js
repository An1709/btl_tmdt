import Post from '../models/Post.js';
import Comment from '../models/Comment.js';
import mongoose from 'mongoose';

// Simple slug generator (no external deps)
const makeSlug = (str) =>
    str
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // strip diacritics
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');

const normalizeTags = (tags) => {
    if (Array.isArray(tags)) {
        return tags.map((tag) => String(tag).trim()).filter(Boolean);
    }

    if (typeof tags === 'string') {
        return tags.split(',').map((tag) => tag.trim()).filter(Boolean);
    }

    return [];
};

const buildExcerpt = (content) => content.replace(/<[^>]+>/g, '').slice(0, 160);

const COMMENT_USER_SELECT = 'username displayName avatarUrl avatar photoURL image';

const mapComment = (comment) => {
    const user = comment.user || {};
    const displayName = user.displayName || user.username || 'Người dùng';

    return {
        _id: comment._id,
        post: comment.post,
        user: user?._id ? {
            _id: user._id,
            username: user.username,
            displayName,
            avatarUrl: user.avatarUrl || user.avatar || user.photoURL || user.image || '',
        } : null,
        userId: user?._id || comment.user,
        username: displayName,
        avatarUrl: user.avatarUrl || user.avatar || user.photoURL || user.image || '',
        rating: Number(comment.rating || 0),
        content: comment.content,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
    };
};

const getCommentSummary = async (postIds) => {
    const ids = Array.isArray(postIds) ? postIds : [postIds];
    const summary = await Comment.aggregate([
        { $match: { post: { $in: ids } } },
        {
            $group: {
                _id: '$post',
                commentCount: { $sum: 1 },
                averageRating: { $avg: '$rating' },
            },
        },
    ]);

    return new Map(summary.map((item) => [
        String(item._id),
        {
            commentCount: item.commentCount,
            reviewCount: item.commentCount,
            averageRating: item.averageRating || 0,
        },
    ]));
};

const getPostSummary = (post, summaryMap) => summaryMap?.get(String(post._id)) || {
    commentCount: 0,
    reviewCount: 0,
    averageRating: 0,
};

const mapPost = (post, fallbackImage, summary = {}, comments = []) => ({
    _id: post._id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt || `${buildExcerpt(post.content)}...`,
    content: post.content,
    coverImage: post.thumbnail || fallbackImage,
    author: post.author,
    tags: post.tags || [],
    comments,
    averageRating: summary.averageRating || 0,
    commentCount: summary.commentCount || 0,
    reviewCount: summary.reviewCount || summary.commentCount || 0,
    viewCount: post.views || 0,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
});

const validatePostPayload = ({ title, content, type, thumbnail }) => {
    if (!title?.trim() || !content?.trim()) {
        return 'Tieu de va noi dung la bat buoc';
    }

    if (type && !['blog', 'forum_topic'].includes(type)) {
        return 'Loai bai viet khong hop le';
    }

    if (thumbnail && typeof thumbnail !== 'string') {
        return 'Anh bai viet khong hop le';
    }

    return null;
};

// @desc    Lấy danh sách bài viết (có phân trang + tìm kiếm)
// @route   GET /api/posts
// @access  Public
export const getPosts = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.min(parseInt(req.query.limit) || 9, 50);
        const search = req.query.search?.trim() || '';

        const filter = { type: 'blog' };
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { tags: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } },
            ];
        }

        const [posts, total] = await Promise.all([
            Post.find(filter)
                .populate('author', 'username displayName avatarUrl')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            Post.countDocuments(filter),
        ]);

        // Map to shape expected by frontend
        const summaryMap = await getCommentSummary(posts.map((p) => p._id));
        const mapped = posts.map((p) => mapPost(
            p,
            `https://images.unsplash.com/photo-${p._id}?w=800&h=450&fit=crop`,
            getPostSummary(p, summaryMap),
        ));

        const totalPages = Math.ceil(total / limit);
        return res.json({
            success: true,
            data: { data: mapped, total, page, limit, totalPages },
        });
    } catch (err) {
        console.error('Error in getPosts:', err);
        res.status(500).json({ success: false, message: 'Lỗi server khi lấy danh sách bài viết' });
    }
};

// @desc    Lấy bài viết theo slug
// @route   GET /api/posts/:slug
// @access  Public
export const getPostBySlug = async (req, res) => {
    try {
        const post = await Post.findOne({ slug: req.params.slug })
            .populate('author', 'username displayName avatarUrl')
            .lean();

        if (!post) return res.status(404).json({ success: false, message: 'Bài viết không tồn tại' });

        // Increment view count
        await Post.findByIdAndUpdate(post._id, { $inc: { views: 1 } });

        const comments = await Comment.find({ post: post._id })
            .populate('user', COMMENT_USER_SELECT)
            .sort({ createdAt: -1 })
            .lean();
        const commentCount = comments.length;
        const averageRating = commentCount
            ? comments.reduce((sum, comment) => sum + Number(comment.rating || 0), 0) / commentCount
            : 0;

        return res.json({
            success: true,
            data: {
                ...mapPost(
                    post,
                    'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=800&h=450&fit=crop',
                    { averageRating, commentCount, reviewCount: commentCount },
                    comments.map(mapComment),
                ),
                viewCount: (post.views || 0) + 1,
            },
        });
    } catch (err) {
        console.error('Error in getPostBySlug:', err);
        res.status(500).json({ success: false, message: 'Lỗi server khi lấy bài viết' });
    }
};

// @desc    Tạo bài viết mới
// @route   POST /api/posts
// @access  Private (Admin/Staff)
export const createPost = async (req, res) => {
    try {
        const { title, content, tags, type, excerpt } = req.body;
        const validationError = validatePostPayload(req.body);
        if (validationError) {
            return res.status(400).json({ success: false, message: validationError });
        }

        const slug = `${makeSlug(title)}-${Date.now()}`;

        const post = await Post.create({
            title: title.trim(),
            slug,
            content: content.trim(),
            excerpt: excerpt?.trim() || buildExcerpt(content),
            author: req.user._id,
            tags: normalizeTags(tags),
            type: type || 'blog',
            thumbnail: req.body.thumbnail?.trim() || req.file?.path || '',
        });

        const populatedPost = await Post.findById(post._id)
            .populate('author', 'username displayName avatarUrl')
            .lean();

        return res.status(201).json({
            success: true,
            data: mapPost(populatedPost, ''),
        });
    } catch (err) {
        console.error('Error in createPost:', err);
        res.status(500).json({ success: false, message: 'Lỗi server khi tạo bài viết' });
    }
};

// @desc    Cap nhat bai viet
// @route   PUT /api/posts/:id
// @access  Private (Admin)
export const updatePost = async (req, res) => {
    try {
        const { title, content, tags, type, excerpt } = req.body;
        const validationError = validatePostPayload(req.body);
        if (validationError) {
            return res.status(400).json({ success: false, message: validationError });
        }

        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ success: false, message: 'Bai viet khong ton tai' });

        const nextTitle = title.trim();
        if (nextTitle !== post.title) {
            post.slug = `${makeSlug(nextTitle)}-${Date.now()}`;
        }

        post.title = nextTitle;
        post.content = content.trim();
        post.excerpt = excerpt?.trim() || buildExcerpt(content);
        post.tags = normalizeTags(tags);
        post.type = type || 'blog';
        post.thumbnail = req.body.thumbnail?.trim() || req.file?.path || '';

        await post.save();

        const populatedPost = await Post.findById(post._id)
            .populate('author', 'username displayName avatarUrl')
            .lean();

        return res.json({
            success: true,
            data: mapPost(populatedPost, ''),
        });
    } catch (err) {
        console.error('Error in updatePost:', err);
        res.status(500).json({ success: false, message: 'Loi server khi cap nhat bai viet' });
    }
};

// @desc    Xóa bài viết
// @route   DELETE /api/posts/:id
// @access  Private (Admin)
const getPostCommentStats = async (postId) => {
    const comments = await Comment.find({ post: postId }).select('rating').lean();
    const commentCount = comments.length;
    const averageRating = commentCount
        ? comments.reduce((sum, comment) => sum + Number(comment.rating || 0), 0) / commentCount
        : 0;

    return { averageRating, commentCount, reviewCount: commentCount };
};

const validateCommentPayload = ({ rating, content }) => {
    const numericRating = Number(rating);

    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
        return { message: 'Vui lòng chọn số sao.', numericRating: 0 };
    }

    if (!content || !String(content).trim()) {
        return { message: 'Vui lòng nhập nội dung bình luận.', numericRating };
    }

    return { message: '', numericRating };
};

// @desc    Them/cap nhat binh luan va danh gia bai viet
// @route   POST /api/posts/:id/comments
// @access  Private
export const upsertPostComment = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(404).json({ success: false, message: 'Bài viết không tồn tại.' });
        }

        const { message, numericRating } = validateCommentPayload(req.body);
        if (message) {
            return res.status(400).json({ success: false, message });
        }

        const post = await Post.findOne({ _id: req.params.id, type: 'blog' }).select('_id').lean();
        if (!post) {
            return res.status(404).json({ success: false, message: 'Bài viết không tồn tại.' });
        }

        const content = String(req.body.content).trim();
        let comment = await Comment.findOne({ post: post._id, user: req.user._id });
        const statusCode = comment ? 200 : 201;

        if (comment) {
            comment.rating = numericRating;
            comment.content = content;
            await comment.save();
        } else {
            comment = await Comment.create({
                post: post._id,
                user: req.user._id,
                rating: numericRating,
                content,
            });
        }

        await comment.populate('user', COMMENT_USER_SELECT);
        const stats = await getPostCommentStats(post._id);

        return res.status(statusCode).json({
            success: true,
            message: 'Cảm ơn bạn đã gửi đánh giá.',
            data: {
                comment: mapComment(comment),
                ...stats,
            },
        });
    } catch (err) {
        console.error('Error in upsertPostComment:', err);
        return res.status(500).json({ success: false, message: 'Không thể gửi bình luận. Vui lòng thử lại sau.' });
    }
};

// @desc    Xoa binh luan bai viet
// @route   DELETE /api/posts/:id/comments/:commentId
// @access  Private (owner/admin)
export const deletePostComment = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id) || !mongoose.isValidObjectId(req.params.commentId)) {
            return res.status(404).json({ success: false, message: 'Bình luận không tồn tại.' });
        }

        const comment = await Comment.findOne({ _id: req.params.commentId, post: req.params.id });
        if (!comment) {
            return res.status(404).json({ success: false, message: 'Bình luận không tồn tại.' });
        }

        const isOwner = String(comment.user) === String(req.user._id);
        const isAdmin = req.user.role === 'admin';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Bạn không có quyền xóa bình luận này.' });
        }

        await comment.deleteOne();
        const stats = await getPostCommentStats(req.params.id);

        return res.json({
            success: true,
            message: 'Đã xóa bình luận.',
            data: stats,
        });
    } catch (err) {
        console.error('Error in deletePostComment:', err);
        return res.status(500).json({ success: false, message: 'Không thể xóa bình luận. Vui lòng thử lại sau.' });
    }
};

export const deletePost = async (req, res) => {
    try {
        const post = await Post.findByIdAndDelete(req.params.id);
        if (!post) return res.status(404).json({ success: false, message: 'Bài viết không tồn tại' });
        res.json({ success: true, message: 'Đã xóa bài viết' });
    } catch (err) {
        console.error('Error in deletePost:', err);
        res.status(500).json({ success: false, message: 'Lỗi server khi xóa bài viết' });
    }
};
