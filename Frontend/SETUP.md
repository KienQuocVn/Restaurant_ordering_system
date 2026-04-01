# QR Order Management System - Setup Guide

## Tong quan

Repo hien tai chay theo mo hinh:

- `Frontend`: Next.js App Router, dong vai tro UI client
- `Backend`: Node.js HTTP server, xu ly auth, order, payment, analytics
- `PostgreSQL`: datastore chinh

Frontend khong con dung Supabase Auth hay `localStorage` lam session chinh cho staff/owner. Session dang nhap duoc cap boi backend bang access token + refresh token trong cookie.

## 1. Chuan bi PostgreSQL

Tao database:

```sql
CREATE DATABASE qr_ordering;
```

Schema va seed:

- `Frontend/scripts/01-init-schema.sql`
- `Frontend/scripts/02-sample-data.sql`

Backend se tu init schema neu database rong. Seed mau duoc dong bo tu runtime backend.

## 2. Cau hinh env

### Backend

Tao `Backend/.env` tu `Backend/.env.example`:

```env
APP_ENV=development
PORT=4000
CORS_ORIGIN=http://localhost:3000
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/qr_ordering
ACCESS_TOKEN_SECRET=replace-with-long-random-string
REFRESH_TOKEN_SECRET=replace-with-long-random-string
REALTIME_TOKEN_SECRET=replace-with-long-random-string
PAYMENT_IPN_SECRET=replace-with-long-random-string
SESSION_COOKIE_SECURE=false
```

### Frontend

Tao `Frontend/.env.local` tu `Frontend/.env.example`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

## 3. Cai dat va chay

### Backend

```bash
cd Backend
npm install
npm run dev
```

### Frontend

```bash
cd Frontend
npm install
npm run dev
```

## 4. Tai khoan demo

- Owner:
  - `owner@example.com`
  - `123456`
- Staff:
  - `staff@example.com`
  - `123456`

## 5. Route chinh

- `/`
- `/customer?token=<qr_token>`
- `/login`
- `/signup`
- `/staff`
- `/owner`
- `/owner/qr-codes`

## 6. Kiem tra nhanh

### Customer

1. Vao `/customer?token=qrtoken_demo_001`
2. Chon mon, tao order
3. Gui yeu cau thanh toan

### Staff

1. Dang nhap voi `staff@example.com`
2. Vao `/staff`
3. Xem order moi qua SSE
4. Cap nhat trang thai va thanh toan

### Owner

1. Dang nhap voi `owner@example.com`
2. Vao `/owner`
3. Kiem tra dashboard, menu, category, staff
4. Vao `/owner/qr-codes` de quan ly ban va QR

## 7. Ghi chu hien trang

- Realtime hien tai dang dung SSE, chua phai WebSocket/Socket.IO
- Payment gateway hien tai la demo flow/IPN mock, chua phai provider production
- Backend can co mot PostgreSQL instance dang chay thi moi verify duoc end-to-end
