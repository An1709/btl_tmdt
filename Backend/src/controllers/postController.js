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
        const mapped = posts.map((p) => ({
            _id: p._id,
            title: p.title,
            slug: p.slug,
            excerpt: p.excerpt || p.content.replace(/<[^>]+>/g, '').slice(0, 160) + '...',
            content: p.content,
            coverImage: p.thumbnail || `https://images.unsplash.com/photo-${p._id}?w=800&h=450&fit=crop`,
            author: p.author,
            tags: p.tags,
            comments: [],
            viewCount: p.views || 0,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
        }));

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
                _id: post._id,
                title: post.title,
                slug: post.slug,
                excerpt: post.excerpt || post.content.replace(/<[^>]+>/g, '').slice(0, 160) + '...',
                content: post.content,
                coverImage: post.thumbnail || 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=800&h=450&fit=crop',
                author: post.author,
                tags: post.tags,
                comments: [],
                viewCount: (post.views || 0) + 1,
                createdAt: post.createdAt,
                updatedAt: post.updatedAt,
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
        if (!title || !content) {
            return res.status(400).json({ success: false, message: 'Tiêu đề và nội dung là bắt buộc' });
        }

        const slug = makeSlug(title) + '-' + Date.now();

        const post = await Post.create({
            title,
            slug,
            content,
            excerpt: excerpt || content.replace(/<[^>]+>/g, '').slice(0, 160),
            author: req.user._id,
            tags: tags || [],
            type: type || 'blog',
            thumbnail: req.body.thumbnail || req.file?.path || '',
        });

        return res.status(201).json({ success: true, data: post });
    } catch (err) {
        console.error('Error in createPost:', err);
        res.status(500).json({ success: false, message: 'Lỗi server khi tạo bài viết' });
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
