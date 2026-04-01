# Roadmap trien khai QR ordering system

## Phase 0 - Chot nen tang va chuan hoa du an

Muc tieu:

- Chot lai pham vi MVP theo `docs/bao-cao.txt`
- Chuan hoa role: `owner/admin`, `staff`, `customer khong can account`
- Chon mot schema du lieu duy nhat
- Tach ro frontend, backend, database, realtime

Cong viec:

- Chuan hoa lai ten bang/field theo bao cao hoac theo schema moi da thong nhat
- Bo sung migration that su cho PostgreSQL
- Sua `02-sample-data.sql` cho hop le
- Viet tai lieu API contract va status flow cua order
- Chot convention:
  - QR token
  - order status
  - payment status
  - session ban

Deliverable:

- So do CSDL chot
- Tai lieu API MVP
- Seed data dung duoc

## Phase 1 - Backend core va database

Muc tieu:

- Xay backend doc lap trong thu muc `Backend`
- Ket noi PostgreSQL that su
- Co auth dung cho admin/staff
- Co public API cho customer scan QR va order

Cong viec:

- Tao backend Node.js + Express hoac NestJS
- Cau hinh env, logging, error handling, validation
- Tao modules:
  - auth
  - restaurants
  - tables
  - categories
  - products
  - sessions
  - orders
  - payments
- Viet migration + seed
- JWT auth cho admin/staff
- Public endpoint validate QR token va mo session ban

Deliverable:

- Backend chay duoc local
- DB schema dung
- Login staff/admin bang JWT
- Customer co the load menu qua QR token

## Phase 2 - Hoan thien luong customer ordering

Muc tieu:

- Khach quet QR, xem menu, dat mon, xem session ban

Cong viec:

- Tao route public theo token ban
- Menu theo category, options, topping, trang thai con/het
- Gio hang:
  - sua so luong
  - ghi chu theo tung mon
  - tong tien
- Tao order vao session dang active
- Hien danh sach mon da goi trong phien
- Nut yeu cau thanh toan tu phia khach

Deliverable:

- Flow KH-01 den KH-09 dat toi thieu muc MVP

## Phase 3 - Staff dashboard va realtime

Muc tieu:

- Nhan vien thay order moi gan realtime
- Ban/bep/cashier co luong xu ly ro rang

Cong viec:

- WebSocket/Socket.IO cho order realtime
- Dashboard nhan vien:
  - table map
  - order queue
  - chi tiet session theo ban
  - xac nhan da nhan
  - cap nhat trang thai order
- Am thanh/thong bao khi co order moi
- Manual order cho staff dat thay khach
- KDS hoac queue cho bep/bar
- In phieu bep co ban

Deliverable:

- NV-02 den NV-09 dat muc MVP co the van hanh trong quan

## Phase 4 - Owner/Admin management

Muc tieu:

- Chu quan co the quan ly toan bo van hanh

Cong viec:

- Quan ly ban:
  - CRUD
  - zone
  - suc chua
  - reset ban
  - QR export PNG/PDF
- Quan ly menu:
  - category CRUD
  - product CRUD
  - options/topping
  - sort order
  - tam an/het mon
- Quan ly nhan vien:
  - tao/sua/xoa
  - phan quyen
  - activity log

Deliverable:

- Khu owner hoan chinh cho menu, tables, staff

## Phase 5 - Thanh toan va in bill

Muc tieu:

- Hoan thien thanh toan dung nhu bao cao

Cong viec:

- Thanh toan tien mat
- VietQR dong theo tong tien
- MoMo Business API
- Webhook/IPN verify
- Doi soat giao dich
- In bill sau thanh toan
- Xu ly timeout/retry QR thanh toan
- Voucher/giam gia co ban

Deliverable:

- Luong thanh toan end-to-end cho staff

## Phase 6 - Dashboard, bao cao, van hanh

Muc tieu:

- Co du lieu quan tri va bao cao cho chu quan

Cong viec:

- Dashboard doanh thu ngay/tuan/thang
- Top mon ban chay
- Hieu suat ban, thoi gian phuc vu
- Bao cao theo phuong thuc thanh toan
- Export CSV/PDF
- Audit log

Deliverable:

- Dashboard phuc vu van hanh that

## Phase 7 - Hardening va production

Muc tieu:

- Dua he thong len production on dinh

Cong viec:

- Test:
  - unit
  - integration
  - e2e
- RLS/policy/nep bao mat
- Monitoring, tracing, log
- Backup
- Rate limit
- PWA/offline cache cho menu
- CI/CD
- Huong dan trien khai VPS/domain/SSL

Deliverable:

- Ban production-ready

## Thu tu uu tien de bat dau ngay

1. Chot lai schema va auth, vi day la diem nghen lon nhat hien tai.
2. Tao backend doc lap trong `Backend` thay vi tiep tuc day logic vao `Frontend/app/api`.
3. Hoan thien public customer flow theo QR token + session ban.
4. Lam realtime cho staff va bep.
5. Tich hop thanh toan sau khi order/session on dinh.
