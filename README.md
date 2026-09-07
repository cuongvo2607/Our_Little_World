# Our Little World (Thế Giới Nhỏ Của Hai Ta) 💖

**Our Little World** là một ứng dụng PWA Progressive Web App riêng tư được thiết kế dành riêng cho 2 người yêu nhau. Được tối ưu theo phong cách Apple (Mobile-first iOS iPhone), bảo mật tuyệt đối bằng Supabase Row Level Security (RLS), hỗ trợ Add to Home Screen và có khả năng deploy trực tiếp lên Vercel Production.

---

## 🌟 Tính Năng Nổi Bật

- **Chỉ dành riêng cho 2 người**: Cơ chế tạo và gia nhập không gian bằng Mã Mời bí mật (Invite Code). Tối đa 2 tài khoản / couple.
- **Love Counter (Bộ Đếm Ngày Yêu)**: Tự động tính số ngày bên nhau chi tiết tới năm, tháng, ngày.
- **Hôm Nay Thế Nào? (Daily Mood)**: Theo dõi cảm xúc hằng ngày của đối phương kèm ghi chú ngắn.
- **Tương Tác Nhanh (I Miss You)**: Nút "Tớ nhớ cậu" với hiệu ứng trái tim tung bay (`canvas-confetti`) và giới hạn tần suất chống spam.
- **Góc Kỷ Niệm (Memories Gallery)**: Bộ sưu tập hình ảnh kỷ niệm, nén ảnh thông minh client-side và lưu trữ bảo mật trên Supabase Private Storage Bucket (`couple-memories`).
- **Hành Trình Tình Yêu (Love Timeline)**: Nhật ký ghi lại các mốc thời gian đáng nhớ.
- **Danh Sách Mơ Ước (Bucket List)**: Danh sách mục tiêu chung với bộ lọc Todo / Completed và hiệu ứng ăn mừng.
- **Hòm Thư Tương Lai (Time Capsule)**: Viết thư bí mật cho tương lai với thời gian mở thư. Nội dung được bảo mật phía server (API Route), tuyệt đối không để lộ ở client trước ngày mở.
- **Khu Vườn Tình Yêu (Love Garden)**: Khu vườn mini tương tác SVG mở khóa cây trồng & vật phẩm dựa trên các mốc kỷ niệm.
- **Cài Đặt PWA trên iPhone**: Trang hướng dẫn `/install` cài đặt ứng dụng vào màn hình chính iPhone (Add to Home Screen) chạy độc lập không có thanh trình duyệt.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 14+ (App Router, TypeScript)
- **Styling**: Tailwind CSS (Apple Minimal Romantic Theme, Glassmorphism, Safe Area Insets)
- **Icons & Animation**: `lucide-react`, `framer-motion`, `canvas-confetti`
- **Utilities**: `date-fns`
- **Backend & Security**: Supabase Auth, PostgreSQL, Row Level Security (RLS), Supabase Storage

---

## 🚀 Hướng Dẫn Cài Đặt & Deploy Chi Tiết

### 1. Clone & Cài Đặt Package
```bash
# Clone dự án
git clone https://github.com/your-username/our-little-world.git
cd "Our Little World"

# Cài đặt các gói phụ thuộc
npm install
```

### 2. Cấu Hình Supabase Database & Storage
1. Tạo một project mới tại [Supabase Dashboard](https://supabase.com).
2. Vào mục **SQL Editor** trong Supabase Dashboard.
3. Mở file `supabase/schema.sql` trong dự án này, copy toàn bộ nội dung SQL và nhấn **Run**.
   - *Lưu ý*: Script này sẽ khởi tạo 10 bảng dữ liệu, hàm kiểm tra giới hạn 2 thành viên, các chính sách RLS bảo mật tuyệt đối và Storage Bucket `couple-memories`.

### 3. Thiết Lập Biến Môi Trường (Environment Variables)
Tạo file `.env.local` từ mẫu `.env.example`:
```bash
cp .env.example .env.local
```
Điền URL và Anon Key lấy từ Supabase Project Settings -> API:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. Chạy Ở Môi Trường Local Development
```bash
npm run dev
```
Mở trình duyệt truy cập: `http://localhost:3000`

---

## ☁️ Deploy Lên Production (Vercel)

1. Đẩy code lên GitHub Repository của bạn:
   ```bash
   git add .
   git commit -m "Initial commit for Our Little World"
   git push origin main
   ```
2. Truy cập [Vercel Dashboard](https://vercel.com) và tạo **New Project** trỏ tới Github repository này.
3. Thêm các biến môi trường tại cấu hình Vercel Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Nhấn **Deploy**.
5. Sau khi deploy xong, truy cập **Supabase Dashboard -> Authentication -> URL Configuration**, thêm URL domain Vercel của bạn vào danh sách **Site URL** và **Redirect URLs**.

---

## 🔒 Kiểm Tra An Toàn Bằng Row Level Security (RLS)

- Mọi thao tác đọc/ghi dữ liệu đều được PostgreSQL RLS kiểm tra thông qua hàm `get_auth_user_couple_id()`. Người ngoài hoặc người thuộc couple khác hoàn toàn KHÔNG thể truy cập dữ liệu của couple khác.
- Ảnh trong bucket `couple-memories` là Private, chỉ được truy cập qua Signed URL tạm thời được cấp quyền tự động bởi RLS.
- Mật khẩu và Service Role Key tuyệt đối KHÔNG bao giờ bị lộ ra client side.

---

Chúc hai bạn có những khoảnh khắc thật ngọt ngào cùng **Our Little World**! ❤️
