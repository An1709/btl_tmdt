# Website bán thú cưng và phụ kiện

## Giới thiệu
Đây là website hỗ trợ người dùng xem, tìm kiếm, đặt mua thú cưng và phụ kiện. Hệ thống có phân quyền người dùng và quản trị viên. Admin có thể quản lý sản phẩm, danh mục, đơn hàng và tài khoản.

## Công nghệ sử dụng
- Frontend: ReactJS, Vite, TailwindCSS, Zustand
- Backend: NodeJS, ExpressJS
- Database: MongoDB (Mongoose)
- Authentication: JWT
- Upload ảnh: Cloudinary, Multer
- Deploy: Vercel (Frontend), Render (Backend), MongoDB Atlas (Database)

## Chức năng chính
- Đăng ký, đăng nhập, đăng xuất
- Xem danh sách sản phẩm
- Tìm kiếm và lọc sản phẩm
- Xem chi tiết sản phẩm
- Thêm sản phẩm vào giỏ hàng
- Đặt hàng
- Theo dõi trạng thái đơn hàng
- Quản lý sản phẩm cho admin
- Quản lý danh mục
- Quản lý đơn hàng
- Quản lý tài khoản người dùng

## Cấu trúc thư mục
```
TMDT/
├── Backend/
│   ├── ml/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middlewares/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/
│   ├── uploads/
│   ├── package.json
│   └── .env.example
├── Frontend/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── stores/
│   │   └── utils/
│   ├── package.json
│   └── .env.example
├── .gitignore
├── AGENTS.md
└── README.md
```

## Hướng dẫn cài đặt và chạy project local

### Backend
- Di chuyển vào thư mục server: `cd Backend`
- Cài dependencies: `npm install`
- Tạo file `.env` dựa trên file mẫu `.env.example`
- Chạy server: `npm run dev`

### Frontend
- Di chuyển vào thư mục client: `cd Frontend`
- Cài dependencies: `npm install`
- Tạo file `.env` dựa trên file mẫu `.env.example`
- Chạy frontend: `npm run dev`

## Biến môi trường mẫu

**Backend**
```env
PORT=5001
MONGODB_URL=
ACCESS_TOKEN_SECRET=
CLIENT_URL=http://localhost:5173
```

**Frontend**
```env
VITE_API_URL=http://localhost:5001/api
```

## Hướng dẫn deploy
- Frontend deploy lên Vercel
- Backend deploy lên Render
- Database dùng MongoDB Atlas
- Cần cấu hình biến môi trường tương ứng trên từng nền tảng

## Ghi chú
- Không commit file `.env`
- Cần cập nhật URL backend production trong frontend khi deploy
- Cần cấu hình CORS để frontend gọi được backend
