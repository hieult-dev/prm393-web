# PRM393 Admin Web

Portal React dành cho quản trị viên quản lý điểm sinh viên. Backend sử dụng
Spring Security Resource Server và JWT HS256.

## Chạy dự án

1. Khởi động PostgreSQL và backend `prm393-be`:

   ```powershell
   cd ..\prm393-be
   .\mvnw.cmd spring-boot:run
   ```

2. Cài và chạy frontend:

   ```powershell
   cd ..\prm393-web
   npm install
   npm run dev
   ```

3. Mở `http://localhost:5173`.

Tài khoản admin mặc định được backend tạo khi khởi động lần đầu:

- Username: `admin`
- Password: `Admin@123`

Hãy đặt `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_EMAIL` và `JWT_SECRET`
trong môi trường production. `JWT_SECRET` phải có ít nhất 32 byte.

## Cấu hình frontend

Sao chép `.env.example` thành `.env` nếu backend không chạy tại địa chỉ mặc định:

```env
VITE_API_BASE_URL=http://localhost:8080/api
```

## API chính

- `POST /api/auth/register`: đăng ký tài khoản sinh viên, mật khẩu BCrypt.
- `POST /api/auth/login`: đăng nhập và nhận JWT.
- `GET /api/admin/students`: danh sách sinh viên (ADMIN).
- `GET /api/admin/subjects`: danh sách môn học (ADMIN).
- `GET /api/admin/semesters`: danh sách học kỳ (ADMIN).
- `GET /api/admin/grades`: lọc điểm theo `userId`, `semesterId` (ADMIN).
- `POST /api/admin/grades`: nhập điểm (ADMIN).
- `PUT /api/admin/grades/{id}`: cập nhật điểm (ADMIN).
- `DELETE /api/admin/grades/{id}`: xóa điểm (ADMIN).

Khi lưu, tổng trọng số các đầu điểm phải bằng `100%`. Backend tự tính điểm
tổng và xếp loại, không tin giá trị tính từ frontend.
