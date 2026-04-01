# Hien trang du an QR ordering

## Cach doc tai lieu

- `[x]`: Da lam xong o muc hien tai
- `[~]`: Da lam mot phan / moi o muc MVP / can hardening them
- `[ ]`: Chua lam

## 1. Tong quan hien tai

### Frontend

- [x] Co ung dung Next.js trong thu muc `Frontend`
- [x] Da tach giao dien theo 3 vai tro:
  - Khach hang: `/customer`
  - Nhan vien: `/staff`
  - Chu quan/Admin: `/owner`, `/owner/qr-codes`
- [x] Khach hang hien tai da co the vao trang order ma khong can login
- [x] Frontend flow chinh da goi backend rieng qua `NEXT_PUBLIC_API_BASE_URL`
- [x] Da bo phu thuoc runtime vao Supabase Auth cho flow dang nhap staff/owner

### Backend

- [x] Da co implementation backend doc lap trong thu muc `Backend`
- [x] Da co kien truc backend rieng cho auth, menu, tables, sessions, orders, payments, categories, staff, owner orders
- [x] Da chuyen datastore chinh sang PostgreSQL
- [~] Van giu JSON snapshot de debug noi bo, nhung khong con dung lam datastore chinh

## 2. Hien trang Frontend

### 2.1 Vai tro khach hang

- [x] `KH-01` Co man hinh scan/nhap QR va vao `/customer` khong can login
- [x] `KH-01` QR token an toan dang `?token=<random>`
- [x] `KH-02` Xem danh sach menu theo danh muc
- [x] `KH-03` Xem chi tiet mon: ten, mo ta, gia, hinh anh
- [x] `KH-03` Tuy chon size, topping, option o muc menu co cau hinh option
- [x] `KH-04` Them mon vao gio hang
- [x] `KH-04` Chinh sua so luong trong gio
- [x] `KH-04` Ghi chu rieng cho tung mon
- [x] `KH-05` Xem lai gio hang truoc khi dat
- [x] `KH-06` Co luong gui order len he thong qua API
- [x] `KH-06` Order day ngay sang nhan vien va bep theo realtime dung nghia o muc SSE MVP
- [x] `KH-07` Xem cac mon da order trong phien ban
- [x] `KH-08` Co the dat tiep tu menu
- [x] `KH-08` Gom nhieu lan goi mon trong mot session ban dung nghia
- [x] `KH-09` Gui yeu cau thanh toan tren giao dien khach

### 2.2 Vai tro chu quan / Admin

#### Quan ly ban

- [x] Co trang QR code cho ban
- [x] Xem danh sach ban
- [x] Tao QR cho ban
- [x] Tai / in QR
- [x] Them ban vao backend datastore
- [x] Sua ban
- [x] Xoa ban
- [x] Quan ly zone / khu vuc
- [x] Reset ban sau thanh toan o muc co ban
- [x] So do ban theo mau trang thai

#### Quan ly menu

- [x] CRUD mon tren giao dien owner
- [x] CRUD category tren UI
- [x] Quan ly option / topping o muc MVP bang cau hinh JSON option trong owner menu
- [x] An / hien tam thoi theo nghia nghiep vu co ban bang `is_available`
- [x] Sap xep thu tu menu
- [x] Upload / quan ly hinh anh mon o muc URL field

#### Quan ly order

- [x] Xem tat ca order theo bo loc co ban
- [x] Xem chi tiet tung order theo nghia quan tri co ban
- [x] Huy mon / huy order kem ly do o muc order
- [x] In bill
- [x] In phieu bep

#### Thanh toan va tai chinh

- [x] Co mot phan thong ke doanh thu va payment methods tren dashboard
- [x] Xem tong tien theo ban theo session hien tai
- [x] Voucher / giam gia
- [x] Doi soat giao dich

#### Dashboard va thong ke

- [x] Co KPI cards
- [x] Co chart top selling items
- [x] Co chart payment methods
- [x] Loc ngay / tuan / thang
- [x] CSV / PDF export
- [x] So luot khach
- [x] So ban phuc vu
- [x] Thoi gian phuc vu trung binh

#### Quan ly nhan vien

- [x] Tao nhan vien
- [x] Sua / kich hoat / vo hieu hoa nhan vien co ban
- [x] Xoa / disable nhan vien o muc nghiep vu co ban
- [x] Phan quyen chi tiet o muc role owner/staff
- [x] Activity log co ban

### 2.3 Vai tro nhan vien

- [x] `NV-01` Dang nhap va vao dashboard rieng
- [x] `NV-02` Xem table overview va mau trang thai co ban
- [x] `NV-02` So khach theo ban
- [x] `NV-02` Tong tien hien tai theo session ban
- [~] `NV-03` Xem chi tiet order qua card
- [x] `NV-03` Click vao ban de xem lich su / session / order co ban
- [x] `NV-04` Thong bao realtime bang SSE
- [x] `NV-04` Am thanh khi co order moi
- [x] `NV-05` Xac nhan da nhan / da chuyen bep dung luong nghiep vu
- [x] `NV-05` Doi trang thai order co ban
- [x] `NV-06` Chon phuong thuc thanh toan
- [x] `NV-06` Tao QR dong theo tong tien o muc backend demo
- [x] `NV-07` Callback / IPN xac nhan thanh toan thanh cong
- [x] `NV-08` In bill co ban
- [x] `NV-08` In phieu bep co ban
- [x] `NV-09` Nhap mon thay khach

## 3. Hien trang Backend

### 3.1 Kien truc va tach rieng he thong

- [x] Co backend doc lap trong thu muc `Backend`
- [x] Frontend goi backend qua base URL rieng
- [x] Tach ro layer:
  - auth
  - tables
  - menu
  - sessions
  - orders
  - payments
  - categories
  - staff
  - realtime (SSE)
- [x] Co env rieng cho frontend va backend

### 3.2 Auth va phan quyen

- [x] Co signin / signup API tren backend rieng
- [x] Luong UI login da chinh lai theo huong chi staff va admin login
- [x] JWT auth dung cho admin / staff
- [x] Middleware / guard chan route theo role o muc server
- [x] Session khong phu thuoc `localStorage`
- [x] Refresh token / secure cookie / session management dung nghia

### 3.3 Database va schema

- [x] Co file schema PostgreSQL: [01-init-schema.sql](d:/Work/Restaurant_ordering_system/Frontend/scripts/01-init-schema.sql)
- [x] Co file sample data PostgreSQL: [02-sample-data.sql](d:/Work/Restaurant_ordering_system/Frontend/scripts/02-sample-data.sql)
- [x] Backend da co ket noi PostgreSQL qua env
- [x] Schema thong nhat voi `docs/bao-cao.txt`
- [x] Schema thong nhat voi code API hien tai
- [x] Co `sessions` trong backend data model
- [x] Mau du lieu seed khop schema that su
- [x] Backend doc lap da co migration/seed PostgreSQL that su

### 3.4 API nghiep vu

#### Public API cho khach

- [x] Co API lay menu
- [x] Co API tao order
- [x] API validate QR token an toan
- [x] API lay session ban dang active
- [x] API lich su mon da goi trong session
- [x] API yeu cau thanh toan

#### API cho nhan vien / admin

- [x] Co API danh sach order cho staff
- [x] Co API update trang thai order co ban
- [x] Co API lay danh sach ban
- [x] Co API tao them ban
- [x] Co API owner menu CRUD co ban
- [x] Co API owner analytics co ban
- [x] Co API category CRUD co ban
- [x] Co API owner quan ly order co ban
- [x] Co API quan ly staff co ban
- [x] API quan ly tables co tao, sua, xoa, reset co ban
- [~] API quan ly categories day du
- [~] API quan ly staff day du

### 3.5 Realtime

- [ ] WebSocket / Socket.IO
- [x] Push order moi cho staff qua SSE
- [x] Dong bo trang thai ban realtime
- [x] Dong bo tong tien theo session realtime

### 3.6 Thanh toan

- [x] Co API payment demo, muc dich chinh la danh dau thanh toan va dong session co ban
- [x] VietQR dong theo tong tien
- [ ] MoMo Business API
- [x] Payment callback / IPN
- [x] Tu dong xac nhan thanh toan thanh cong
- [x] Doi soat payment history

### 3.7 In bill / bep

- [x] In bill
- [x] In phieu bep
- [ ] Tich hop may in nhiet

## 4. Nhung diem da dung huong so voi bao cao

- [x] Da tach giao dien theo 3 vai tro
- [x] Da di theo huong web app QR ordering
- [x] Da co mot phan luong MVP:
  - xem menu
  - them gio
  - tao order
  - staff xu ly order co ban
  - owner quan ly mon
  - tao QR
- [x] Da sua UI de khach hang khong can login nua
- [x] Da chuyen schema va auth ve huong PostgreSQL + cookie-first dung nghia

## 5. Nhung diem chua dung hoac chua khop bao cao

- [x] Payment callback / IPN
- [x] JWT auth cho admin / staff
- [x] Nhan vien khong duoc truy cap route owner neu khong dung role
- [x] In bill / in phieu bep o muc client print co ban
- [x] Dashboard co filter ngay / tuan / thang va export CSV/PDF muc co ban
- [ ] WebSocket / Socket.IO hai chieu
- [ ] Payment gateway production

## 6. No ky thuat uu tien xu ly

### 6.1 Schema va code

- [x] Thong nhat ten bang va ten cot giua bao cao, SQL va code
- [x] Xu ly lech `name` va `full_name`
- [x] Xu ly lech Supabase Auth va `password_hash NOT NULL`
- [x] Sua sample data cho khop schema
- [x] Chuan hoa order status, payment status, table status

### 6.2 Bao mat va phan quyen

- [x] Bo `localStorage` lam session chinh cho staff/admin
- [x] Bo viec dung `NEXT_PUBLIC_SUPABASE_ANON_KEY` cho API server-side quan trong
- [x] Them middleware / authorization check o backend

### 6.3 Tach rieng backend

- [x] Tao skeleton backend trong thu muc `Backend`
- [x] Chuyen cac API route nghiep vu chinh sang backend
- [x] De frontend dong vai tro client UI cho flow chinh
- [x] Tach code backend thanh `src/config`, `src/data`, `src/services`, `src/routes`, `src/utils`
- [x] Tach seed / service sang backend theo huong PostgreSQL that su

## 7. Tinh trang test/build hien tai

- [x] `npm.cmd exec tsc --noEmit`
- [x] `node -c Backend/server.js`
- [x] `node -c Backend/src/routes/index.js`
- [x] `node -c Backend/src/data/store.js`
- [~] Chua verify end-to-end voi mot instance PostgreSQL dang chay trong may hien tai

## 8. Danh sach route frontend de test

- [x] `/`
- [x] `/customer`
- [x] `/customer?token=<qrToken>`
- [x] `/login`
- [x] `/signup`
- [x] `/staff`
- [x] `/owner`
- [x] `/owner/qr-codes`

## 9. Ket luan ngan

Project hien tai da qua moc quan trong cua phase 0 va phase 1:
- Co schema PostgreSQL chot
- Co seed dung schema
- Co auth cookie-first + refresh token + session server-side
- Co frontend/backend tach rieng va goi API dung huong

Phan can uu tien tiep theo la realtime hai chieu bang WebSocket/Socket.IO, hardening validation/test, va payment production.
