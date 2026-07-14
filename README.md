# PRM393 Teacher Web

Portal React dành cho giáo viên nhập điểm sinh viên theo môn được phân công và xem lịch dạy.
Backend sử dụng Spring Security Resource Server và JWT HS256.

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

Web chỉ cho phép tài khoản có role `TEACHER`. Backend cần có dữ liệu:

- role `TEACHER`
- tài khoản teacher
- phân công teacher với subject
- sinh viên đã enroll vào subject trong semester
- lịch có `teacher_id` nếu muốn hiển thị lịch dạy

## Cấu hình frontend

Tạo `.env` nếu backend không chạy tại địa chỉ mặc định:

```env
VITE_API_BASE_URL=http://localhost:8080/api
```

## API chính

- `POST /api/auth/login`: đăng nhập và nhận JWT.
- `GET /api/teacher/semesters`: danh sách học kỳ.
- `GET /api/teacher/subjects?semesterId=`: môn teacher được phân công.
- `GET /api/teacher/students?subjectId=&semesterId=&search=`: sinh viên thuộc môn teacher dạy.
- `GET /api/teacher/grades?userId=&semesterId=&subjectId=`: điểm trong phạm vi môn teacher dạy.
- `POST /api/teacher/grades`: nhập điểm.
- `PUT /api/teacher/grades/{id}`: cập nhật điểm.
- `DELETE /api/teacher/grades/{id}`: xóa điểm.
- `GET /api/teacher/schedules?semesterId=`: lịch dạy của teacher.

Khi lưu điểm, tổng trọng số các đầu điểm phải bằng `100%`. Backend tự tính điểm tổng và xếp loại, frontend không gửi giá trị tổng.
