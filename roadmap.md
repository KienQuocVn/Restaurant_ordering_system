# Roadmap trien khai QR ordering system

Cap nhat tien do: 2026-04-01

## Phase 0 - Chot nen tang va chuan hoa du an

Muc tieu:

- [x] Chot lai pham vi MVP theo `docs/bao-cao.txt`
- [x] Chuan hoa role: `owner/admin`, `staff`, `customer khong can account`
- [x] Chon mot schema du lieu duy nhat
- [x] Tach ro frontend, backend, database, realtime

Cong viec:

- [x] Chuan hoa lai ten bang/field theo schema moi da thong nhat
- [x] Bo sung migration that su cho PostgreSQL
- [x] Sua `02-sample-data.sql` cho hop le
- [~] Viet tai lieu API contract va status flow cua order
- [x] Chot convention:
  - QR token
  - order status
  - payment status
  - session ban

Deliverable:

- [x] So do CSDL chot
- [~] Tai lieu API MVP
- [x] Seed data dung duoc

Nhan xet:

- Phase 0 da hoan thanh phan lon.
- Muc con mo rong them la tai lieu contract API chi tiet va hardening convention o muc production.

## Phase 1 - Backend core va database

Muc tieu:

- [x] Xay backend doc lap trong thu muc `Backend`
- [x] Ket noi PostgreSQL that su
- [x] Co auth dung cho admin/staff
- [x] Co public API cho customer scan QR va order

Cong viec:

- [x] Tao backend Node.js doc lap
- [x] Cau hinh env, error handling, auth cookie va session
- [x] Tao modules:
  - auth
  - tables
  - categories
  - products/menu
  - sessions
  - orders
  - payments
- [x] Viet migration + seed
- [x] JWT auth cho admin/staff
- [x] Public endpoint validate QR token va mo session ban

Deliverable:

- [~] Backend chay duoc local khi da co PostgreSQL env va database san sang
- [x] DB schema dung
- [x] Login staff/admin bang JWT + refresh token + cookie session
- [x] Customer co the load menu qua QR token

Nhan xet:

- Phase 1 da dat duoc phan cot loi.
- Phan can tiep tuc sau phase 1 la validation, automated tests, va WebSocket cho realtime hai chieu.

## Phase 2 - Hoan thien luong customer ordering

Muc tieu:

- [x] Khach quet QR, xem menu, dat mon, xem session ban

Cong viec:

- [x] Tao route public theo token ban
- [x] Menu theo category, options, topping, trang thai con/het
- [x] Gio hang:
  - sua so luong
  - ghi chu theo tung mon
  - tong tien
- [x] Tao order vao session dang active
- [x] Hien danh sach mon da goi trong phien
- [x] Nut yeu cau thanh toan tu phia khach

Deliverable:

- [x] Flow KH-01 den KH-09 dat toi thieu muc MVP

## Phase 3 - Staff dashboard va realtime

Muc tieu:

- [~] Nhan vien thay order moi gan realtime
- [~] Ban/bep/cashier co luong xu ly ro rang

Cong viec:

- [ ] WebSocket/Socket.IO cho order realtime
- [x] Dashboard nhan vien:
  - table map
  - order queue
  - chi tiet session theo ban
  - xac nhan da nhan
  - cap nhat trang thai order
- [x] Am thanh/thong bao khi co order moi
- [x] Manual order cho staff dat thay khach
- [~] KDS hoac queue cho bep/bar
- [x] In phieu bep co ban

Deliverable:

- [~] NV-02 den NV-09 dat muc MVP, nhung realtime van dang o SSE thay vi WebSocket

## Phase 4 - Owner/Admin management

Muc tieu:

- [x] Chu quan co the quan ly phan lon van hanh

Cong viec:

- [x] Quan ly ban:
  - CRUD
  - zone
  - suc chua
  - reset ban
  - QR export
- [x] Quan ly menu:
  - category CRUD
  - product CRUD
  - options/topping
  - sort order
  - tam an/het mon
- [~] Quan ly nhan vien:
  - tao/sua/xoa
  - phan quyen
  - activity log

Deliverable:

- [~] Khu owner da dung duoc cho menu, tables, staff; can hardening them

## Phase 5 - Thanh toan va in bill

Muc tieu:

- [~] Hoan thien thanh toan dung nhu bao cao o muc MVP demo

Cong viec:

- [x] Thanh toan tien mat
- [x] VietQR dong theo tong tien
- [ ] MoMo Business API
- [x] Webhook/IPN verify
- [x] Doi soat giao dich
- [x] In bill sau thanh toan
- [~] Xu ly timeout/retry QR thanh toan
- [x] Voucher/giam gia co ban

Deliverable:

- [~] Luong thanh toan end-to-end da co o muc demo/MVP, chua phai production gateway

## Phase 6 - Dashboard, bao cao, van hanh

Muc tieu:

- [x] Co du lieu quan tri va bao cao co ban cho chu quan

Cong viec:

- [x] Dashboard doanh thu ngay/tuan/thang
- [x] Top mon ban chay
- [x] Hieu suat ban, thoi gian phuc vu
- [x] Bao cao theo phuong thuc thanh toan
- [x] Export CSV/PDF
- [~] Audit log

Deliverable:

- [~] Dashboard da phuc vu van hanh MVP, can hardening them neu dua production

## Phase 7 - Hardening va production

Muc tieu:

- [ ] Dua he thong len production on dinh

Cong viec:

- [ ] Test:
  - unit
  - integration
  - e2e
- [ ] Monitoring, tracing, log
- [ ] Backup
- [ ] Rate limit
- [ ] PWA/offline cache cho menu
- [ ] CI/CD
- [ ] Huong dan trien khai VPS/domain/SSL

Deliverable:

- [ ] Ban production-ready

## Thu tu uu tien de bat dau ngay

1. [x] Chot schema va auth.
2. [x] Duy tri backend doc lap trong `Backend`.
3. [x] Hoan thien public customer flow theo QR token + session ban.
4. [ ] Nang SSE len WebSocket/Socket.IO.
5. [ ] Tich hop thanh toan production sau khi realtime va validation on dinh.
