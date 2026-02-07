class APIFeatures {
    constructor(query, queryString) {
        this.query = query;           // Query của Mongoose (VD: Product.find())
        this.queryString = queryString; // Query params từ URL (VD: req.query)
    }

    // 1. Tìm kiếm cơ bản
    search() {
        const keyword = this.queryString.keyword
            ? {
                  name: {
                      $regex: this.queryString.keyword,
                      $options: 'i', // Không phân biệt hoa thường
                  },
              }
            : {};

        this.query = this.query.find({ ...keyword });
        return this;
    }

    // 2. Lọc nâng cao (Giá >= 100k,...)
    filter() {
        // Sao chép query string để không ảnh hưởng object gốc
        const queryObj = { ...this.queryString };
        
        // Loại bỏ các trường đặc biệt không phải là trường lọc
        const excludedFields = ['page', 'sort', 'limit', 'fields', 'keyword'];
        excludedFields.forEach((el) => delete queryObj[el]);

        // Chuyển đổi các toán tử: gte, gt, lte, lt => $gte, $gt...
        let queryStr = JSON.stringify(queryObj);
        queryStr = queryStr.replace(/\b(gte|gt|lte|lt|regex)\b/g, (match) => `$${match}`);

        this.query = this.query.find(JSON.parse(queryStr));
        return this;
    }

    // 3. Sắp xếp (Sort)
    sort() {
        if (this.queryString.sort) {
            // VD: ?sort=price,-sold => price -sold
            const sortBy = this.queryString.sort.split(',').join(' ');
            this.query = this.query.sort(sortBy);
        } else {
            // Mặc định: Mới nhất lên đầu
            this.query = this.query.sort('-createdAt');
        }
        return this;
    }

    // 4. Giới hạn trường hiển thị (Select fields)
    limitFields() {
        if (this.queryString.fields) {
            const fields = this.queryString.fields.split(',').join(' ');
            this.query = this.query.select(fields);
        } else {
            this.query = this.query.select('-__v'); // Loại bỏ field __v của Mongoose
        }
        return this;
    }

    // 5. Phân trang (Pagination)
    pagination() {
        const page = this.queryString.page * 1 || 1; // Trang hiện tại (Mặc định 1)
        const limit = this.queryString.limit * 1 || 10; // Số lượng item/trang (Mặc định 10)
        const skip = (page - 1) * limit; // Số lượng item cần bỏ qua

        this.query = this.query.skip(skip).limit(limit);
        return this;
    }
}

export default APIFeatures;