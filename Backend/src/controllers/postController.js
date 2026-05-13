import Post from '../models/Post.js';

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

const mapPost = (post, fallbackImage) => ({
    _id: post._id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt || `${buildExcerpt(post.content)}...`,
    content: post.content,
    coverImage: post.thumbnail || fallbackImage,
    author: post.author,
    tags: post.tags || [],
    comments: [],
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
        const mapped = posts.map((p) => mapPost(p, `https://images.unsplash.com/photo-${p._id}?w=800&h=450&fit=crop`));

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

        return res.json({
            success: true,
            data: {
                ...mapPost(post, 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=800&h=450&fit=crop'),
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
