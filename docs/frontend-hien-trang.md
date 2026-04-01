# Hien trang frontend QR ordering

## 1. Tong quan

Frontend hien tai la mot ung dung Next.js gom 3 khu vuc giao dien chinh:

- Khach hang: `/customer`
- Nhan vien: `/staff`
- Chu quan/Admin: `/owner`, `/owner/qr-codes`

Du an da co kha nhieu man hinh demo va API route trong `Frontend/app/api/*`, nhung chua co backend doc lap trong thu muc `Backend`. Phan lon logic hien tai dang chay theo kieu frontend + API route demo + Supabase.

## 2. Doi chieu voi `docs/bao-cao.txt`

### 2.1 Vai tro khach hang

- `KH-01`: Dat mot phan
  - Da co man hinh scan/nhap QR va co the vao `/customer` khong can login.
  - Chua co QR token an toan theo kieu `?table=abc123token` nhu bao cao, hien tai QR dang la chuoi thuan `restaurantId|table_x`.
- `KH-02`: Da co
  - Da xem menu theo danh muc.
- `KH-03`: Dat mot phan
  - Da hien ten, mo ta, gia, hinh anh.
  - Chua co size, topping, option.
- `KH-04`: Dat mot phan
  - Da them vao gio, sua so luong.
  - Ghi chu hien tai la ghi chu chung cho don, chua la ghi chu rieng tung mon.
- `KH-05`: Da co
  - Da xem lai gio hang va chinh sua truoc khi dat.
- `KH-06`: Dat mot phan
  - Da co API tao order.
  - Chua co realtime day ngay sang man hinh nhan vien/bep dung nghia.
- `KH-07`: Chua co
  - Chua co man hinh xem cac mon da order trong phien ban.
- `KH-08`: Dat mot phan
  - Co the dat tiep tu menu, nhung chua co session ban dung nghia de gom nhieu lan goi mon.
- `KH-09`: Chua co
  - Chua co nut/gui yeu cau thanh toan tren giao dien khach.

### 2.2 Vai tro chu quan/Admin

- Quan ly ban: Dat mot phan
  - Da co trang QR code, xem danh sach ban, tao QR, tai/in QR.
  - Them ban hien tai la mock tren client, chua luu DB.
  - Chua co CRUD day du, zone, reset ban, so do ban theo mau trang thai.
- Quan ly menu: Dat mot phan
  - Da co CRUD mon.
  - Chua co CRUD category tren UI.
  - Chua co option/topping, an/hien tam thoi dung nghia, sort menu, upload anh.
- Quan ly order: Chua dat
  - Chua co man hinh owner xem tat ca order theo bo loc, huy mon, in bill, in phieu bep.
- Thanh toan & tai chinh: Dat rat it
  - Co mot phan thong ke doanh thu va payment method.
  - Chua co tong tien theo ban real-time, voucher, doi soat giao dich.
- Dashboard & thong ke: Dat mot phan
  - Da co KPI va chart top selling/payment methods.
  - Chua co loc ngay/tuan/thang, CSV/PDF, so luot khach, thoi gian phuc vu.
- Quan ly nhan vien: Chua co
  - Chua co CRUD staff, phan quyen chi tiet, activity log.

### 2.3 Vai tro nhan vien

- `NV-01`: Da co
  - Nhan vien dang nhap va vao dashboard rieng.
- `NV-02`: Dat mot phan
  - Co table overview va mau trang thai co ban.
  - Chua co so khach, tong tien hien tai theo dung nghia session ban.
- `NV-03`: Dat mot phan
  - Da xem chi tiet order qua card.
  - Chua co luong click vao ban de xem lich su/order day du.
- `NV-04`: Chua dat
  - Hien tai polling 5 giay, khong co WebSocket, am thanh, thong bao realtime.
- `NV-05`: Dat mot phan
  - Da doi trang thai order.
- `NV-06`: Dat mot phan
  - Da chon phuong thuc thanh toan.
  - Chua tao QR dong theo tong tien.
- `NV-07`: Chua co
  - Chua co callback thanh toan/IPN.
- `NV-08`: Chua co
  - Chua in bill, chua in phieu bep.
- `NV-09`: Chua co
  - Chua co man hinh nhap mon thay khach.

## 3. Danh gia dung/sai so voi bao cao

### Dung huong

- Da tach giao dien theo 3 vai tro.
- Da co huong tiep can web app/PWA, phu hop bai toan QR ordering.
- Da co nhung luong cot loi muc MVP: xem menu, them gio, tao order, staff xu ly order, owner quan ly mon, tao QR.

### Chua dung hoac chua khop bao cao

- Bao cao quy dinh khach hang khong can login.
  - Frontend ban dau bat khach login. Phan UI route nay da duoc dieu chinh lai.
- Bao cao quy dinh admin va nhan vien moi login.
  - Code auth va signup ban dau van cho phep `customer`.
- Bao cao mo ta QR token ngau nhien.
  - Hien tai QR la chuoi de doan `restaurantId|table_x`, chua an toan.
- Bao cao mo ta luong realtime bang WebSocket.
  - Hien tai chi polling 5 giay.
- Bao cao mo ta phan tich/payments/backend tach ro.
  - Hien tai du an van la frontend + API route, chua co backend doc lap.

## 4. Van de ky thuat can uu tien xu ly

### 4.1 Schema va code chua thong nhat

Co do lech giua 3 noi:

- `docs/bao-cao.txt`
- `Frontend/scripts/01-init-schema.sql`
- code API/frontend hien tai

Vi du:

- Bao cao dung `tables`, `categories`, `products`, `sessions`; schema hien tai dung `dining_tables`, `menu_categories`, `menu_items`, khong co `sessions`.
- API auth dang insert `name`, trong khi schema SQL dang co `full_name`.
- API auth phu thuoc Supabase Auth, nhung schema `users` lai co cot `password_hash NOT NULL`, khong khop cach dang nhap dang ky hien tai.
- `02-sample-data.sql` khong khop `01-init-schema.sql`:
  - dung ID dang chuoi `rest-001`, `table-001` thay vi UUID
  - insert cot `status` vao `dining_tables` trong khi schema khong co cot nay
- API/analitycs/payments va mot so field order da tung khong khop schema; mot phan route da duoc chinh lai, nhung tong the van can chuan hoa.

### 4.2 Bao mat va phan quyen chua dung yeu cau

- Session dang giu bang `localStorage`, chua phai JWT auth cho admin/staff.
- API route dang tao Supabase client bang `NEXT_PUBLIC_SUPABASE_ANON_KEY`, nghia la chua co server-side authorization dung muc.
- Chua co middleware chan route theo role o muc server.

### 4.3 Chua co backend doc lap

- Thu muc `Backend` hien tai chua co implementation.
- Chua co service cho auth, order, payment, realtime, webhook.
- Chua co migration/seed/backend architecture theo dung roadmap trong bao cao.

## 5. Tinh trang test/build hien tai

- `npm.cmd run lint`: that bai vi project chua cai `eslint` du script da khai bao.
- `npm.cmd run build`: sau khi sua import QR code, loi build con lai trong moi truong nay la do `next/font/google` can tai font `Geist`, nhung sandbox khong co internet.

Luu y:

- Day la loi build trong moi truong khong co network, khong phai loi logic frontend chinh.
- Tuy nhien project van con no ky thuat ve schema, auth va backend can giai quyet truoc khi xem la san sang production.

## 6. Danh sach route frontend de test

### Public / customer

- `/`
  - Landing page
- `/customer`
  - Trang order cua khach, khong can login
- `/customer?restaurant=<restaurantId>&table=<tableId>`
  - Vao thang menu cho mot ban cu the neu co query param

### Staff / admin

- `/login`
  - Login cho staff va admin
- `/signup`
  - Tao tai khoan staff/admin
- `/staff`
  - Dashboard nhan vien
- `/owner`
  - Dashboard chu quan/admin
- `/owner/qr-codes`
  - Quan ly QR code ban

## 7. Goi y test nhanh hien tai

- Khach hang:
  - Vao `/customer`
  - Nhap QR dang `restaurantId|tableId`, vi du `rest-001|table_1`
- Nhan vien:
  - Dang nhap roi vao `/staff`
  - Kiem tra tab Orders, Tables, Completed
- Chu quan:
  - Dang nhap roi vao `/owner`
  - Kiem tra Dashboard, Menu Management, Settings
  - Vao `/owner/qr-codes` de test QR

## 8. Ket luan ngan

Frontend hien tai da co bo khung MVP kha ro, nhung moi dung muc prototype/demo. Neu doi chieu nghiem tuc voi `docs/bao-cao.txt` thi du an moi dat mot phan cac yeu cau giao dien, chua dat phan backend, realtime, payment callback, session ban, bao mat va quan tri van hanh.
