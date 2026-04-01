# Hien trang du an QR ordering

## Cach doc tai lieu

- `[x]`: Da lam xong o muc hien tai
- `[~]`: Da lam mot phan / moi o muc demo / chua dung hoan toan theo bao cao
- `[ ]`: Chua lam

Tai lieu nay tach rieng:

- Phan `Frontend`: nhung gi da co tren giao dien va frontend flow
- Phan `Backend`: nhung gi da co o API, auth, database, realtime, payment

## 1. Tong quan hien tai

### Frontend

- [x] Co ung dung Next.js trong thu muc `Frontend`
- [x] Da tach giao dien theo 3 vai tro:
  - Khach hang: `/customer`
  - Nhan vien: `/staff`
  - Chu quan/Admin: `/owner`, `/owner/qr-codes`
- [x] Khach hang hien tai da co the vao trang order ma khong can login
- [x] Frontend flow chinh da goi backend rieng, khong con phu thuoc `Frontend/app/api/*`
- [x] Da tach frontend thanh mot client goi backend doc lap qua `NEXT_PUBLIC_API_BASE_URL`

### Backend

- [x] Da bo cac API route demo cu trong `Frontend/app/api/*`, frontend flow chinh di truc tiep qua backend rieng
- [x] Co file schema SQL va sample data trong `Frontend/scripts/*`
- [x] Da co implementation backend doc lap trong thu muc `Backend`
- [x] Da co kien truc backend rieng cho auth, menu, tables, sessions, orders, payments, categories, staff, owner orders; da bo sung realtime SSE cho flow order/table/session

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
- [x] `KH-06` Order day ngay sang nhan vien va bep theo realtime dung nghia
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
- [x] Them ban vao backend data store that su
- [x] Sua ban
- [x] Xoa ban
- [x] Quan ly zone / khu vuc
- [x] Reset ban sau thanh toan o muc co ban
- [ ] So do ban theo mau trang thai

#### Quan ly menu

- [x] CRUD mon tren giao dien owner
- [x] CRUD category tren UI
- [x] Quan ly option / topping o muc MVP bang cau hinh JSON option trong owner menu
- [x] An / hien tam thoi theo nghia nghiep vu co ban bang `is_available`
- [x] Sap xep thu tu menu
- [x] Upload / quan ly hinh anh mon

#### Quan ly order

- [x] Xem tat ca order theo bo loc co ban
- [x] Xem chi tiet tung order theo nghia quan tri co ban
- [x] Huy mon / huy order kem ly do o muc order
- [x] In bill
- [x] In phieu bep

#### Thanh toan va tai chinh

- [~] Co mot phan thong ke doanh thu va payment methods tren dashboard
- [~] Xem tong tien theo ban theo session hien tai
- [ ] Voucher / giam gia
- [ ] Doi soat giao dich

#### Dashboard va thong ke

- [x] Co KPI cards
- [x] Co chart top selling items
- [x] Co chart payment methods
- [x] Loc ngay / tuan / thang
- [x] CSV / PDF export
- [ ] So luot khach
- [ ] So ban phuc vu
- [ ] Thoi gian phuc vu trung binh

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
- [ ] `NV-05` Xac nhan da nhan / da chuyen bep dung luong nghiep vu
- [x] `NV-05` Doi trang thai order co ban
- [x] `NV-06` Chon phuong thuc thanh toan
- [x] `NV-06` Tao QR dong theo tong tien o muc backend demo
- [ ] `NV-07` Callback / IPN xac nhan thanh toan thanh cong
- [x] `NV-08` In bill co ban
- [x] `NV-08` In phieu bep co ban
- [ ] `NV-09` Nhap mon thay khach

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
- [~] Co env rieng cho frontend va backend

### 3.2 Auth va phan quyen

- [x] Co signin / signup API tren backend rieng
- [x] Luong UI login da chinh lai theo huong chi staff va admin login
- [x] JWT auth dung cho admin / staff
- [x] Middleware / guard chan route theo role o muc server
- [ ] Session khong phu thuoc `localStorage`
- [ ] Refresh token / secure cookie / session management dung nghia

### 3.3 Database va schema

- [x] Co file schema: [01-init-schema.sql](d:/Work/Restaurant_ordering_system/Frontend/scripts/01-init-schema.sql)
- [x] Co file sample data: [02-sample-data.sql](d:/Work/Restaurant_ordering_system/Frontend/scripts/02-sample-data.sql)
- [x] Backend da co ket noi database local SQLite tai `Backend/data/store.db`
- [ ] Schema thong nhat voi `docs/bao-cao.txt`
- [ ] Schema thong nhat voi code API hien tai
- [x] Co `sessions` trong backend data model
- [ ] Mau du lieu seed khop schema that su
- [~] Backend doc lap da co seed rieng bang JSON va dong bo sang SQLite local; chua phai migration/seed PostgreSQL that su

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
- [x] Push order moi cho bep / KDS qua SSE muc MVP
- [x] Dong bo trang thai ban realtime
- [x] Dong bo tong tien theo session realtime

### 3.6 Thanh toan

- [~] Co API payment demo, muc dich chinh la danh dau thanh toan va dong session co ban
- [ ] VietQR dong theo tong tien
- [ ] MoMo Business API
- [ ] IPN / callback verification
- [ ] Tu dong xac nhan thanh toan thanh cong
- [ ] Doi soat payment history

### 3.7 In bill / bep

- [x] In bill
- [x] In phieu bep
- [ ] Tich hop may in nhiet

## 4. Nhung diem da dung huong so voi bao cao

- [x] Da tach giao dien theo 3 vai tro
- [x] Da di theo huong web app / PWA cho bai toan QR ordering
- [x] Da co mot phan luong MVP:
  - xem menu
  - them gio
  - tao order
  - staff xu ly order co ban
  - owner quan ly mon
  - tao QR
- [x] Da sua UI de khach hang khong can login nua

## 5. Nhung diem chua dung hoac chua khop bao cao

- [x] QR token ngau nhien / an toan theo mo ta bao cao o muc backend demo
- [x] Realtime SSE cho order/table/session o muc MVP
- [x] Session ban dung nghia o muc backend demo
- [x] Backend doc lap
- [ ] Payment callback / IPN
- [ ] JWT auth cho admin / staff
- [ ] Nhan vien khong duoc truy cap dashboard doanh thu bang server-side authorization
- [x] In bill / in phieu bep o muc client print co ban
- [x] Dashboard co filter ngay / tuan / thang va export CSV/PDF muc co ban

## 6. No ky thuat uu tien xu ly

### 6.1 Schema va code chua thong nhat

- [ ] Thong nhat ten bang va ten cot giua bao cao, SQL va code
- [ ] Xu ly lech `name` va `full_name`
- [ ] Xu ly lech Supabase Auth va `password_hash NOT NULL`
- [ ] Sua sample data cho khop schema
- [ ] Chuan hoa order status, payment status, table status

### 6.2 Bao mat va phan quyen

- [ ] Bo `localStorage` lam session chinh cho staff/admin
- [ ] Bo viec dung `NEXT_PUBLIC_SUPABASE_ANON_KEY` cho API server-side quan trong
- [x] Them middleware / authorization check o backend

### 6.3 Tach rieng backend

- [x] Tao skeleton backend trong thu muc `Backend`
- [x] Chuyen cac API route nghiep vu chinh sang backend
- [x] De frontend dong vai tro client UI cho flow chinh
- [x] Tach code backend thanh `src/config`, `src/data`, `src/services`, `src/routes`, `src/utils`
- [~] Tach seed / service sang backend; webhook / realtime chua co

## 7. Tinh trang test/build hien tai

- [ ] `npm.cmd run lint`
  - That bai vi project chua cai `eslint` du script da khai bao
- [~] `npm.cmd run build`
  - Da build qua buoc compile sau khi bo Google Fonts online; loi con lai la `spawn EPERM` do moi truong hien tai

Luu y:

- Loi build hien tai trong phien kiem tra nay chu yeu do moi truong khong co network
- Nhung project van chua san sang production vi con no schema, auth, backend, realtime, payment

## 8. Danh sach route frontend de test

### Public / customer

- [x] `/`
- [x] `/customer`
- [x] `/customer?restaurant=<restaurantId>&table=<tableId>`
- [x] `/customer?token=<qrToken>`

### Staff / admin

- [x] `/login`
- [x] `/signup`
- [x] `/staff`
- [x] `/owner`
- [x] `/owner/qr-codes`

## 9. Goi y test nhanh hien tai

### Khach hang

- [x] Vao `/customer`
- [x] Nhap QR dang `restaurantId|tableId`, vi du `rest-001|table_1`
- [x] Test QR token an toan theo URL that su
- [x] Test lich su order trong session
- [x] Test yeu cau thanh toan

### Nhan vien

- [x] Dang nhap roi vao `/staff`
- [x] Kiem tra tab Orders
- [x] Kiem tra tab Tables
- [x] Kiem tra tab Completed
- [x] Click tung ban de xem chi tiet session/order
- [x] Test thong bao realtime
- [x] Test QR thanh toan dong o muc link/QR demo
- [x] Test in bill / in bep co ban

### Chu quan

- [x] Dang nhap roi vao `/owner`
- [x] Kiem tra Dashboard
- [x] Kiem tra Menu Management
- [x] Kiem tra Category Management
- [x] Kiem tra Order Management
- [x] Kiem tra Staff Management
- [x] Kiem tra Settings
- [x] Vao `/owner/qr-codes` de test QR
- [x] Test tao/sua/xoa/reset table va sinh QR co ban
- [x] Test CRUD category co ban
- [x] Test quan ly nhan vien co ban

## 10. Ket luan ngan

Project hien tai da co bo khung frontend kha ro va backend rieng o muc demo/co ban. Neu dung tai lieu nay de quan ly tien do thi:

- Frontend: da co nen tang UI va nhieu flow MVP da noi sang backend moi
- Backend: da co he thong doc lap cho auth, menu, tables, sessions, orders, payments, categories, staff, owner orders
- Cac muc can uu tien nhat:
  - chuan hoa schema
  - lam auth dung
  - realtime
  - payment callback
